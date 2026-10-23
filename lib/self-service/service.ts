import { createHash } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { ApiError, type AuthenticatedActor } from "@/lib/api";
import { applyBalanceMutations, type BalanceMutationEntry } from "@/lib/balances/mutations";
import type { CustomerChangeInput, OrderChangePreview, OrderReference } from "@/lib/contracts/customer-self-service";
import { toWeeklyRefundBalanceMutation } from "@/lib/orders/weekly-refund";
import { resolveEffectiveOrderCustomerInfo } from "@/lib/orders/effective-customer-info";
import { resolveServiceability } from "@/lib/zones/service-areas";
import CustomerOrderChange from "@/models/CustomerOrderChange";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup, { type IWeeklyEntitlementGroup } from "@/models/WeeklyEntitlementGroup";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { assertEligible } from "./eligibility";
import { resolveAddress } from "./address";
import { getChangeCutoff, getCancellationCutoff } from "./cutoff";
export { getChangeCutoff } from "./cutoff";

type VerifiedAddress = Awaited<ReturnType<typeof resolveAddress>>;
type OrderDoc = mongoose.HydratedDocument<any>;
type Loaded = { ref: OrderReference; order: OrderDoc };

async function loadOrder(ref: OrderReference, userId: unknown, session?: ClientSession): Promise<Loaded> {
  const query = { orderId: ref.orderId, userId };
  const order = ref.kind === "daily"
    ? await DailyDeliveryOrder.findOne(query).session(session || null)
    : await WeeklyOrder.findOne(query).session(session || null);
  if (!order) throw new ApiError("Order not found", { status: 404 });
  return { ref, order };
}

const positive = (value: unknown) => Number.isInteger(value) && Number(value) > 0;

function snapshotItems(items: any[]) {
  return items.map(item => {
    const plain = typeof item.toObject === "function" ? item.toObject() : { ...item };
    // Mongoose generates a new subdocument ID on each read when legacy/imported
    // items have none stored. Compare meal data, not these transient IDs.
    delete plain._id;
    return plain;
  });
}

async function buildChange(input: CustomerChangeInput, userId: unknown, address?: VerifiedAddress, session?: ClientSession) {
  const cutoff = await (input.action === "cancel" ? getCancellationCutoff(session) : getChangeCutoff(session));
  let loaded: Loaded[] = [];
  let group: mongoose.HydratedDocument<IWeeklyEntitlementGroup> | null = null;
  const refunds: BalanceMutationEntry[] = [];
  if (input.action === "cancel") {
    const first = await loadOrder(input.order, userId, session);
    if (input.order.kind === "weekly") {
      const groupId = first.order.weeklyEntitlementGroupId;
      if (!groupId) throw new ApiError("This older weekly order needs staff review.", { status: 409 });
      group = await WeeklyEntitlementGroup.findOne({ groupId, userId }).session(session || null);
      if (!group || group.cancelledAt || group.refundedAt) throw new ApiError("This weekly group needs staff review or has already been cancelled.", { status: 409 });
      const children = await WeeklyOrder.find({ weeklyEntitlementGroupId: groupId }).sort({ orderId: 1 }).session(session || null);
      if (children.length !== group.splitDeliveryCount || children.some(o => String(o.userId) !== String(userId))) {
        throw new ApiError("The weekly group is incomplete. Please contact support.", { status: 409 });
      }
      loaded = children.map(order => ({ order, ref: { kind: "weekly", orderId: order.orderId } }));
      const allocated = children.map(o => o.items.reduce((sum, item) => sum + item.quantity, 0));
      if (allocated.some((count, i) => !positive(count) || count !== children[i].allocatedMealCount) || allocated.reduce((sum, count) => sum + count, 0) !== group.totalMealsForWeek) {
        throw new ApiError("The weekly meal allocation needs staff review.", { status: 409 });
      }
      const debited = children.filter(o => o.voucherDeducted === true);
      if (!debited.length || children.some(o => o.mealPlanType !== group!.mealPlanType)) throw new ApiError("The original payment needs staff review.", { status: 409 });
      if (group.mealPlanType === "legacy") {
        if (debited.some(o => !positive(o.creditCost))) throw new ApiError("The credit deduction needs staff review.", { status: 409 });
        refunds.push({ field: "credits", amount: debited.reduce((s, o) => s + o.creditCost, 0), operation: "add" });
      } else {
        if (!positive(group.voucherCountUsed) || debited.length !== group.voucherCountUsed) throw new ApiError("The voucher deduction needs staff review.", { status: 409 });
        const refund = toWeeklyRefundBalanceMutation({ kind: "weekly-plan", amount: 1, planId: `weekly-${group.mealPlanType.replace("aweek", "")}x1` });
        if (!refund) throw new ApiError("The plan needs staff review.", { status: 409 });
        refunds.push({ ...refund, amount: group.voucherCountUsed });
      }
    } else {
      loaded = [first];
      for (const [key, field] of [["twoDish", "twoDishVoucher"], ["threeDish", "threeDishVoucher"]] as const) {
        const amount = first.order.voucherCost?.[key];
        if (!Number.isInteger(amount) || amount < 0) throw new ApiError("The voucher deduction needs staff review.", { status: 409 });
        if (amount) refunds.push({ field, amount, operation: "add" });
      }
      if (!refunds.length) throw new ApiError("The original payment needs staff review.", { status: 409 });
    }
  } else {
    const refs = [...new Map(input.orders.map(o => [`${o.kind}:${o.orderId}`, o])).values()].sort((a, b) => a.orderId.localeCompare(b.orderId));
    for (const ref of refs) loaded.push(await loadOrder(ref, userId, session));
    if (!address) throw new ApiError("Verified address required");
    const coverage = resolveServiceability({
      // Address changes must use the operational polygon/FSA rules. Never use
      // the resolver's legacy city-label fallback when location data is absent.
      areaLabel: undefined, postalCode: address.addressGeo.postalCode,
      lat: address.addressGeo.lat, lng: address.addressGeo.lng,
    });
    const unsupported = [...new Set(loaded.filter(o => o.ref.kind === "daily" ? !coverage.canDaily : !coverage.canWeekly).map(o => o.ref.kind === "daily" ? "Daily Bento" : "Weekly Meal Box"))];
    if (unsupported.length) {
      throw new ApiError(`The new address is outside the delivery area for ${unsupported.join(" and ")}. Choose an address served by every selected delivery.`, { status: 422, code: "ADDRESS_OUTSIDE_COVERAGE" });
    }
  }
  const orders = loaded.map(({ ref, order }) => {
    const deadline = assertEligible(order, cutoff);
    const info = resolveEffectiveOrderCustomerInfo(order);
    return { ...ref, dates: [...new Set<string>(order.items.map((i: { date: string; deliveryDateISO?: string }) => i.deliveryDateISO || i.date))], address: Object.values(info.deliveryAddress).filter(Boolean).join(", "), cutoff: deadline };
  });
  const snapshot = createHash("sha256").update(JSON.stringify({
    orders: loaded.map(o => ({ id: o.order.orderId, updatedAt: o.order.updatedAt, status: o.order.status, items: snapshotItems(o.order.items), override: o.order.orderCustomerOverride })),
    group: group ? { id: group.groupId, updatedAt: group.updatedAt, count: group.splitDeliveryCount } : null,
    cutoff, refunds,
  })).digest("hex");
  const preview: OrderChangePreview = {
    action: input.action, orders, groupId: group?.groupId,
    // Every member passed the date-based eligibility check above. The earliest
    // deadline controls the entire group, regardless of which order was clicked.
    ...(group ? { groupCutoff: orders.map(order => order.cutoff).sort()[0] } : {}),
    refunds: refunds.map(({ field, amount }) => ({ field, amount })),
    ...(address ? { newAddress: address.address, saveForFuture: input.action === "address" && input.saveForFuture } : {}),
  };
  return { loaded, group, refunds, snapshot, preview };
}

export async function previewChange(input: CustomerChangeInput, actor: AuthenticatedActor, ownerId: unknown = actor.user._id) {
  const address = input.action === "address" ? await resolveAddress(input.address) : undefined;
  const built = await buildChange(input, ownerId, address);
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const operation = await CustomerOrderChange.create({ userId: ownerId, action: input.action, payload: { input, address }, snapshot: built.snapshot, preview: built.preview, expiresAt });
  return { ...built.preview, operationId: String(operation._id), expiresAt: expiresAt.toISOString() };
}

export async function confirmChange(operationId: string, actor: AuthenticatedActor, request: Request, ownerId: unknown = actor.user._id) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const operation = await CustomerOrderChange.findOne({ _id: operationId, userId: ownerId }).session(session);
      if (!operation) throw new ApiError("Change request not found", { status: 404 });
      if (operation.state === "completed") return operation.result;
      if (operation.expiresAt < new Date()) throw new ApiError("This preview expired. Please review the change again.", { status: 409, code: "REVIEW_EXPIRED" });
      const { input, address } = operation.payload as { input: CustomerChangeInput; address?: VerifiedAddress };
      const built = await buildChange(input, ownerId, address, session);
      if (built.snapshot !== operation.snapshot) throw new ApiError("An order changed. Please review the latest details before confirming.", { status: 409, code: "REVIEW_CHANGED" });
      const user = await User.findById(ownerId).session(session);
      if (!user) throw new ApiError("Customer not found", { status: 404 });
      let transactionId: string | undefined;
      if (input.action === "cancel") {
        const balance = await applyBalanceMutations({ user, mutations: built.refunds, transactionType: "refund", description: `Customer cancellation ${built.group?.groupId || input.order.orderId}`, session, actor, request, auditAction: "customer-order.cancel", auditTargetType: "order-change", auditTargetId: operationId });
        transactionId = balance.transaction?.transactionId;
        if (built.group) {
          built.group.cancelledAt = new Date(); built.group.refundedAt = new Date();
          built.group.refundTransactionId = transactionId;
          await built.group.save({ session });
        }
      }
      for (const { ref, order } of built.loaded) {
        if (input.action === "cancel") {
          order.status = "refunded";
          order.refundedAt = new Date();
        } else if (address) {
          const before = resolveEffectiveOrderCustomerInfo(order).deliveryAddress;
          // Replace the full address so clearing unit/buzzer cannot resurrect a stale value.
          order.deliveryAddress = { ...address.address, lat: address.addressGeo.lat, lng: address.addressGeo.lng };
          order.area = address.address.province;
          const override = order.orderCustomerOverride?.toObject?.() || order.orderCustomerOverride || {};
          delete override.deliveryAddress; delete override.area;
          order.orderCustomerOverride = override;
          (order.orderCustomerOverrideLogs ||= []).push({ updatedAt: new Date(), updatedBy: `customer:${user._id}`, changedFields: ["address"], changedDetails: [{ field: "address", from: JSON.stringify(before), to: JSON.stringify(address.address) }] });
          order.orderCustomerOverrideLogs = order.orderCustomerOverrideLogs.slice(-30);
        }
        // A concurrent dispatch/admin write invalidates the whole transaction.
        const Model = ref.kind === "daily" ? DailyDeliveryOrder : WeeklyOrder;
        const saved = await (Model as typeof DailyDeliveryOrder).updateOne({ _id: order._id, updatedAt: order.updatedAt, status: { $in: ["pending", "confirmed"] } }, { $set: {
          status: order.status, ...(input.action === "cancel" ? { refundedAt: order.refundedAt } : { deliveryAddress: order.deliveryAddress, area: order.area, orderCustomerOverride: order.orderCustomerOverride, orderCustomerOverrideLogs: order.orderCustomerOverrideLogs }),
        } }, { session });
        if (saved.modifiedCount !== 1) throw new ApiError("An order changed. Please review the latest details before confirming.", { status: 409, code: "REVIEW_CHANGED" });
      }
      if (input.action === "address" && input.saveForFuture && address) {
        user.address = address.address; user.addressGeo = address.addressGeo;
        user.addressVerified = true; user.addressVerifiedAt = new Date();
        await user.save({ session });
      }
      await AuditLog.create([{ actorUserId: actor.user._id, actorRole: actor.role, action: `customer-order.${input.action}`, targetType: "order-change", targetId: operationId, metadata: { customerId: String(ownerId), preview: built.preview, transactionId } }], { session });
      const result = { ...built.preview, operationId, transactionId, completed: true };
      operation.state = "completed"; operation.completedAt = new Date(); operation.result = result;
      await operation.save({ session });
      return result;
    });
  } finally { await session.endSession(); }
}

export async function listChangeableOrders(actor: AuthenticatedActor, ownerId: unknown = actor.user._id) {
  const cutoff = await getChangeCutoff();
  const query = { userId: ownerId, status: { $in: ["pending", "confirmed", "delivery"] } };
  const [daily, weekly] = await Promise.all([DailyDeliveryOrder.find(query).sort({ createdAt: -1 }).limit(100).lean(), WeeklyOrder.find(query).sort({ createdAt: -1 }).limit(100).lean()]);
  return [...daily.map(order => ({ order, kind: "daily" as const })), ...weekly.map(order => ({ order, kind: "weekly" as const }))].map(({ order, kind }) => {
    let reason = "", cutoffAt = "";
    try { cutoffAt = assertEligible(order, cutoff); } catch (e) { reason = (e as Error).message; }
    return { kind, orderId: order.orderId, dates: order.items.map(i => i.deliveryDateISO || i.date), groupId: kind === "weekly" ? (order as any).weeklyEntitlementGroupId : null, eligible: !reason, reason, cutoff: cutoffAt };
  });
}

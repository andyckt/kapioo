import { ApiError } from "@/lib/api/errors";
import type { OrderActionAvailability, OrderReference } from "@/lib/contracts/customer-self-service";
import WeeklyOrder from "@/models/WeeklyOrder";
import WeeklyEntitlementGroup from "@/models/WeeklyEntitlementGroup";
import { assertEligible } from "./eligibility";
import { getChangeCutoff, getCancellationCutoff } from "./cutoff";

type Order = Parameters<typeof assertEligible>[0] & {
  orderId: string;
  userId: unknown;
  weeklyEntitlementGroupId?: string;
};

/** Read-only display hints. Preview and confirmation still enforce eligibility. */
export async function getOrderActionAvailability(orders: Order[], kind: OrderReference["kind"], now = new Date()) {
  const result = new Map<string, OrderActionAvailability>();
  if (!orders.length) return result;
  const readDeadline = async (read: typeof getChangeCutoff) => {
    try { return await read(); }
    catch (error) { if (error instanceof ApiError) return null; throw error; }
  };
  const [addressCutoff, cancellationCutoff] = await Promise.all([
    readDeadline(getChangeCutoff), readDeadline(getCancellationCutoff),
  ]);
  const deadline = (order: Order, cutoff: Awaited<ReturnType<typeof readDeadline>>) => {
    if (!cutoff) return null;
    try { return assertEligible(order, cutoff, now); }
    catch (error) { if (error instanceof ApiError) return null; throw error; }
  };
  const groupIds = kind === "weekly"
    ? [...new Set(orders.map(order => order.weeklyEntitlementGroupId).filter((id): id is string => Boolean(id)))]
    : [];
  // Load all members, including earlier deliveries outside the current page.
  const [groups, members] = groupIds.length ? await Promise.all([
    WeeklyEntitlementGroup.find({ groupId: { $in: groupIds } }).lean(),
    WeeklyOrder.find({ weeklyEntitlementGroupId: { $in: groupIds } })
      .select("orderId userId weeklyEntitlementGroupId status items deliveryDispatch deliveredAt proofOfDelivery").lean(),
  ]) : [[], []];
  const groupDeadlines = new Map<string, { owner: string; until: string | null }>();
  for (const group of groups) {
    const children = members.filter(order => order.weeklyEntitlementGroupId === group.groupId);
    const deadlines = children.map(order => deadline(order, cancellationCutoff));
    const complete = children.length > 0 && children.length === group.splitDeliveryCount &&
      children.every(order => String(order.userId) === String(group.userId));
    groupDeadlines.set(group.groupId, {
      owner: String(group.userId),
      until: complete && !group.cancelledAt && !group.refundedAt && deadlines.every((value): value is string => value !== null)
        ? deadlines.sort()[0] : null,
    });
  }
  for (const order of orders) {
    const addressUntil = deadline(order, addressCutoff);
    const cancelUntil = deadline(order, cancellationCutoff);
    const group = groupDeadlines.get(order.weeklyEntitlementGroupId || "");
    result.set(order.orderId, {
      addressUntil,
      cancelUntil: kind === "daily" ? cancelUntil
        : cancelUntil && group?.owner === String(order.userId) ? group.until : null,
    });
  }
  return result;
}

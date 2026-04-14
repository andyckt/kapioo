import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  resolveEffectiveOrderCustomerInfo,
  type EffectiveCustomerInfo,
  type OrderCustomerOverride,
} from "@/lib/orders/effective-customer-info"
import User from "@/models/User"

type AdminOrderResponseUser = {
  _id?: unknown
  name?: string
  email?: string
} | null

type AdminOrderResponseShape = {
  userId?: unknown
  phoneNumber?: string | null
  area?: string | null
  specialInstructions?: string | null
  deliveryAddress?: {
    unitNumber?: string
    streetAddress?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
    buzzCode?: string
  } | null
  orderCustomerOverride?: OrderCustomerOverride | null
}

export type AdminOrderWithResolvedCustomer<TOrder> = TOrder & {
  user: AdminOrderResponseUser
  effectiveCustomerInfo: EffectiveCustomerInfo
  hasOrderOnlyOverride: boolean
  orderOnlyOverrideMeta: {
    updatedAt?: Date | string
    updatedBy?: string
  }
}

function extractUserId(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "object" && "_id" in value && value._id) {
    return String(value._id)
  }

  if (typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString()
  }

  return null
}

export async function findAdminOrderUser(userId: unknown): Promise<AdminOrderResponseUser> {
  const resolvedUserId = extractUserId(userId)
  if (!resolvedUserId) {
    return null
  }

  return (await User.findById(resolvedUserId).select("name email").lean()) as AdminOrderResponseUser
}

export function buildAdminOrderResponse<TOrder extends AdminOrderResponseShape>(
  order: TOrder,
  user: AdminOrderResponseUser
): AdminOrderWithResolvedCustomer<TOrder> {
  return {
    ...order,
    user,
    effectiveCustomerInfo: resolveEffectiveOrderCustomerInfo(order, user),
    hasOrderOnlyOverride: hasOrderCustomerOverride(order),
    orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(order),
  }
}

export async function enrichAdminOrderResponse<TOrder extends AdminOrderResponseShape>(
  order: TOrder
): Promise<AdminOrderWithResolvedCustomer<TOrder>> {
  const user = await findAdminOrderUser(order.userId)
  return buildAdminOrderResponse(order, user)
}

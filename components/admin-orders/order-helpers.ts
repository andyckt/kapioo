import type {
  AdminOrder,
  AdminOrderAddress,
  AdminOrderCustomerInfo,
  AdminOrderUpdateLog,
} from "@/lib/types/orders"

export function formatAddress(address?: AdminOrderAddress, area?: string) {
  if (!address && !area) {
    return "N/A"
  }

  const parts = [address?.unitNumber, address?.streetAddress, address?.postalCode, address?.country]
    .filter(Boolean)
    .join(", ")

  return [parts, area].filter(Boolean).join(" | ") || "N/A"
}

export function getEffectiveCustomerInfo(order: AdminOrder): AdminOrderCustomerInfo {
  const fallbackAddress = (order.deliveryAddress || {}) as AdminOrderAddress
  const fallback: AdminOrderCustomerInfo = {
    name:
      typeof order.customerName === "string"
        ? order.customerName
        : typeof order.name === "string"
          ? order.name
          : "",
    email:
      typeof order.customerEmail === "string"
        ? order.customerEmail
        : typeof order.userEmail === "string"
          ? order.userEmail
          : typeof order.email === "string"
            ? order.email
            : "",
    phoneNumber: typeof order.phoneNumber === "string" ? order.phoneNumber : "",
    area: typeof order.area === "string" ? order.area : "",
    specialInstructions:
      typeof order.specialInstructions === "string" ? order.specialInstructions : "",
    deliveryAddress: fallbackAddress,
  }

  return {
    ...fallback,
    ...(order.effectiveCustomerInfo || {}),
    deliveryAddress: {
      unitNumber:
        order.effectiveCustomerInfo?.deliveryAddress?.unitNumber ?? fallbackAddress.unitNumber ?? "",
      streetAddress:
        order.effectiveCustomerInfo?.deliveryAddress?.streetAddress ??
        fallbackAddress.streetAddress ??
        "",
      postalCode:
        order.effectiveCustomerInfo?.deliveryAddress?.postalCode ?? fallbackAddress.postalCode ?? "",
      country:
        order.effectiveCustomerInfo?.deliveryAddress?.country ?? fallbackAddress.country ?? "",
      buzzCode:
        order.effectiveCustomerInfo?.deliveryAddress?.buzzCode ?? fallbackAddress.buzzCode ?? "",
    },
  }
}

export function getOrderUpdateLogs(order: AdminOrder): AdminOrderUpdateLog[] {
  if (!Array.isArray(order.orderCustomerOverrideLogs)) {
    return []
  }

  return [...order.orderCustomerOverrideLogs].sort((a, b) => {
    const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return right - left
  })
}

export function createEmptyOrderOverrideForm() {
  return {
    name: "",
    phoneNumber: "",
    area: "",
    specialInstructions: "",
    deliveryAddress: {
      unitNumber: "",
      streetAddress: "",
      postalCode: "",
      country: "",
      buzzCode: "",
    },
  }
}

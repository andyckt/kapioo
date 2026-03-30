import type { CreditRequest } from "@/lib/types/admin"

export function getCreditRequestUserInfo(request?: CreditRequest | null) {
  if (!request?.userId || typeof request.userId === "string") {
    return {
      id: typeof request?.userId === "string" ? request.userId : request?.userName || "Unknown User",
      name: request?.userName || "Unknown User",
      email: request?.userEmail || "",
    }
  }

  return {
    id: request.userId._id || request.userId.userID || request.userName || "Unknown User",
    name: request.userId.name || request.userName || "Unknown User",
    email: request.userId.email || request.userEmail || "",
  }
}

export function getCreditRequestAmount(request?: CreditRequest | null) {
  return Number(request?.amount ?? 0)
}

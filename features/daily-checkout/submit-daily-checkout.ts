"use client"

import type { CheckoutAddressFormData } from "@/components/checkout-address-form"
import { mergeStoredUser } from "@/lib/client-user-cache"
import type { CartItem, DayData, DeliveryAddress } from "@/lib/daily-delivery"
import { submitDailyOrder } from "@/lib/daily-delivery"

import type { DailyCheckoutFormData } from "./use-daily-checkout-state"

type ToastFn = (options: {
  title: string
  description: string
  variant?: "default" | "destructive"
}) => void

type DailyCheckoutUser = {
  _id: string
  address?: DeliveryAddress
}

type DailyCheckoutSubmitParams = {
  addressFormData: CheckoutAddressFormData
  cart: CartItem[]
  days: Record<string, DayData>
  editingAddress: boolean
  formData: DailyCheckoutFormData
  language: "en" | "zh"
  onSuccess: () => void
  setIsLoading: (loading: boolean) => void
  setUserVouchers: (vouchers: { twoDish: number; threeDish: number }) => void
  toast: ToastFn
  userData: DailyCheckoutUser | null
  userVouchers: {
    twoDish: number
    threeDish: number
  }
}

async function sendDailyOrderSummaryEmail(orderResults: unknown[]) {
  try {
    const emailPayload = {
      type: "daily",
      orderIds: orderResults
        .map((result) => {
          const orderData =
            typeof result === "object" && result !== null && "data" in result
              ? (result as { data?: { orderId?: string } }).data
              : (result as { orderId?: string })
          return orderData?.orderId
        })
        .filter(Boolean),
    }

    const response = await fetch("/api/send-order-summary-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    })

    const result = await response.json()
    if (!result.success) {
      console.error("Failed to send daily order summary email:", result.error)
    }
  } catch (error) {
    console.error("Failed to send daily order summary email:", error)
  }
}

export async function submitDailyCheckout({
  addressFormData,
  cart,
  days,
  editingAddress,
  formData,
  language,
  onSuccess,
  setIsLoading,
  setUserVouchers,
  toast,
  userData,
  userVouchers,
}: DailyCheckoutSubmitParams) {
  try {
    const cartByDate: Record<string, CartItem[]> = {}

    cart.forEach((item) => {
      if (!cartByDate[item.date]) {
        cartByDate[item.date] = []
      }
      cartByDate[item.date].push(item)
    })

    const orderResults: unknown[] = []
    let totalRemainingVouchers = {
      twoDish: userVouchers.twoDish,
      threeDish: userVouchers.threeDish,
    }
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    let orderIndex = 0
    for (const [date, dateItems] of Object.entries(cartByDate)) {
      const idempotencyKey = `${batchId}-order-${orderIndex}`
      orderIndex += 1

      const enhancedDateItems = dateItems.map((item) => {
        const dayData = days[item.day]
        const combo = dayData?.combos?.find((candidate) => candidate.id === item.comboId)
        const dishes = combo ? (item.type === "A" ? combo.typeA.dishes : combo.typeB.dishes) : []

        return {
          ...item,
          dishes,
        }
      })

      const dateVouchersNeeded = enhancedDateItems.reduce(
        (totals, item) => {
          if (item.voucherType === "twoDish") {
            totals.twoDish += item.quantity
          } else if (item.voucherType === "threeDish") {
            totals.threeDish += item.quantity
          }
          return totals
        },
        { twoDish: 0, threeDish: 0 }
      )

      if (
        totalRemainingVouchers.twoDish < dateVouchersNeeded.twoDish ||
        totalRemainingVouchers.threeDish < dateVouchersNeeded.threeDish
      ) {
        throw new Error("Insufficient vouchers for all orders")
      }

      const orderData = {
        userId: userData?._id || "",
        items: enhancedDateItems,
        specialInstructions: formData.specialInstructions,
        deliveryAddress: (editingAddress
          ? addressFormData
          : userData?.address) as DeliveryAddress,
        phoneNumber: formData.phone,
        area: formData.area,
        idempotencyKey,
      }

      let retryCount = 0
      const maxRetries = 2
      let result: Awaited<ReturnType<typeof submitDailyOrder>> | null = null

      while (retryCount <= maxRetries) {
        try {
          result = await submitDailyOrder(orderData)

          if (result && !result.error) {
            break
          }

          if (result.error && !result.error.includes("timeout") && !result.error.includes("timed out")) {
            throw new Error(result.error)
          }

          retryCount += 1
          if (retryCount <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : ""
          if (retryCount < maxRetries && (message.includes("timeout") || message.includes("fetch"))) {
            retryCount += 1
            await new Promise((resolve) => setTimeout(resolve, 2000))
          } else {
            throw error
          }
        }
      }

      if (!result || result.error) {
        throw new Error(result?.error || "Order submission failed")
      }

      totalRemainingVouchers = result.remainingVouchers
      orderResults.push(result)
    }

    if (userData) {
      mergeStoredUser({
        twoDishVoucher: totalRemainingVouchers.twoDish,
        threeDishVoucher: totalRemainingVouchers.threeDish,
      })
      setUserVouchers({
        twoDish: totalRemainingVouchers.twoDish,
        threeDish: totalRemainingVouchers.threeDish,
      })
    }

    await sendDailyOrderSummaryEmail(orderResults)

    const orderCount = Object.keys(cartByDate).length
    toast({
      title: language === "zh" ? "订单完成" : "Order Completed",
      description:
        language === "zh"
          ? `您的${orderCount}天的订单已成功提交`
          : `Your ${orderCount} orders have been successfully placed`,
    })

    onSuccess()
  } catch (error) {
    console.error("Error during daily checkout:", error)
    toast({
      title: language === "zh" ? "订单失败" : "Order Failed",
      description: language === "zh" ? "处理您的订单时出错" : "Error processing your order",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

"use client"

import type { CheckoutAddressFormData } from "@/components/checkout-address-form"
import { mergeStoredUser } from "@/lib/client-user-cache"
import type { CartItem, DeliveryDay } from "@/lib/weekly-subscription"
import {
  submitUserSubscription,
  validateSelectedDates,
} from "@/lib/weekly-subscription"

import type { WeeklyCheckoutFormData } from "./use-weekly-checkout-state"

type ToastFn = (options: {
  title: string
  description: string
  variant?: "default" | "destructive"
}) => void

type WeeklyCheckoutUser = {
  _id: string
  address?: CheckoutAddressFormData
  credits?: number
  weeklySIXmeals?: number
  weeklyEIGHTmeals?: number
  weeklyTENmeals?: number
  weeklyTWELVEmeals?: number
  weeklySIXTEENmeals?: number
}

type WeeklyMealPlanType = "6aweek" | "8aweek" | "10aweek" | "12aweek" | "16aweek"

type WeeklyCheckoutSubmitParams = {
  addressFormData: CheckoutAddressFormData
  cart: CartItem[]
  deliveryDays: DeliveryDay[]
  editingAddress: boolean
  formData: WeeklyCheckoutFormData
  language: "en" | "zh"
  onSuccess: () => void
  setIsLoading: (loading: boolean) => void
  setUserCredits: (credits: number) => void
  setWeeklyEIGHTmeals: (value: number) => void
  setWeeklySIXTEENmeals: (value: number) => void
  setWeeklySIXmeals: (value: number) => void
  setWeeklyTENmeals: (value: number) => void
  setWeeklyTWELVEmeals: (value: number) => void
  toast: ToastFn
  totalItems: number
  userCredits: number
  userData: WeeklyCheckoutUser | null
}

function getSelectedMealPlanType(
  totalItemsAcrossAllDates: number,
  freshUser: WeeklyCheckoutUser
): WeeklyMealPlanType | undefined {
  const freshSixMeals = freshUser.weeklySIXmeals || 0
  const freshEightMeals = freshUser.weeklyEIGHTmeals || 0
  const freshTenMeals = freshUser.weeklyTENmeals || 0
  const freshTwelveMeals = freshUser.weeklyTWELVEmeals || 0
  const freshSixteenMeals = freshUser.weeklySIXTEENmeals || 0

  if (totalItemsAcrossAllDates === 6 && freshSixMeals > 0) {
    return "6aweek"
  }
  if (totalItemsAcrossAllDates === 8 && freshEightMeals > 0) {
    return "8aweek"
  }
  if (totalItemsAcrossAllDates === 10 && freshTenMeals > 0) {
    return "10aweek"
  }
  if (totalItemsAcrossAllDates === 12 && freshTwelveMeals > 0) {
    return "12aweek"
  }
  if (totalItemsAcrossAllDates === 16 && freshSixteenMeals > 0) {
    return "16aweek"
  }
  if (freshSixMeals > 0) {
    return "6aweek"
  }
  if (freshEightMeals > 0) {
    return "8aweek"
  }
  if (freshTenMeals > 0) {
    return "10aweek"
  }
  if (freshTwelveMeals > 0) {
    return "12aweek"
  }
  if (freshSixteenMeals > 0) {
    return "16aweek"
  }

  return undefined
}

async function sendWeeklyOrderSummaryEmail(orderResults: unknown[]) {
  try {
    const emailPayload = {
      type: "weekly",
      orderIds: orderResults
        .map((result) => {
          const orderData =
            typeof result === "object" && result !== null && "order" in result
              ? (result as { order?: { orderId?: string } }).order
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
      console.error("Failed to send weekly order summary email:", result.error)
    }
  } catch (error) {
    console.error("Failed to send weekly order summary email:", error)
  }
}

export async function submitWeeklyCheckout({
  addressFormData,
  cart,
  deliveryDays,
  editingAddress,
  formData,
  language,
  onSuccess,
  setIsLoading,
  setUserCredits,
  setWeeklyEIGHTmeals,
  setWeeklySIXTEENmeals,
  setWeeklySIXmeals,
  setWeeklyTENmeals,
  setWeeklyTWELVEmeals,
  toast,
  totalItems,
  userCredits,
  userData,
}: WeeklyCheckoutSubmitParams) {
  if (!userData?.address && !editingAddress) {
    toast({
      title: language === "zh" ? "出错了" : "Error Occurred",
      description: language === "zh" ? "请添加配送地址" : "Please add a delivery address",
      variant: "destructive",
    })
    setIsLoading(false)
    return
  }

  const deliveryAddress = {
    ...(editingAddress ? addressFormData : userData?.address),
    country: "Canada",
  }

  if (
    !deliveryAddress ||
    !deliveryAddress.streetAddress ||
    !deliveryAddress.province ||
    !deliveryAddress.postalCode
  ) {
    toast({
      title: language === "zh" ? "出错了" : "Error Occurred",
      description: language === "zh" ? "请填写完整的地址信息" : "Please provide a complete address",
      variant: "destructive",
    })
    setIsLoading(false)
    return
  }

  try {
    const userDataStr = localStorage.getItem("user")
    if (!userDataStr) {
      toast({
        title: language === "zh" ? "请先登录" : "Please Log In",
        description:
          language === "zh"
            ? "您需要登录才能完成订阅"
            : "You need to log in to complete your subscription",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const storedUser = JSON.parse(userDataStr) as WeeklyCheckoutUser

    const [freshUserData, freshDeliveryDaysData] = await Promise.all([
      fetch(`/api/users/${storedUser._id}`).then((response) => response.json()),
      fetch("/api/weekly-subscription/user").then((response) => response.json()),
    ])

    if (!freshUserData.success || !freshUserData.data) {
      throw new Error(freshUserData.error || "Failed to fetch user data for validation")
    }

    if (!freshDeliveryDaysData.success || !freshDeliveryDaysData.data) {
      throw new Error("Failed to fetch current delivery schedule")
    }

    const freshUser = freshUserData.data as WeeklyCheckoutUser
    const currentUser = userData ?? storedUser
    const currentDeliveryDays = freshDeliveryDaysData.data as DeliveryDay[]

    const uniqueDates = Array.from(
      new Set(
        cart
          .map((item) => {
            const day = currentDeliveryDays.find(
              (deliveryDay) =>
                deliveryDay.id === item.dayId &&
                deliveryDay.weekOffset === item.weekOffset
            )
            return day?.date
          })
          .filter(Boolean)
      )
    ) as string[]

    const validation = validateSelectedDates(uniqueDates, currentDeliveryDays)
    if (!validation.isValid) {
      throw new Error(
        validation.error ||
          (language === "zh"
            ? "请选择连续的配送日期（周日+周二 或 周二+周日）"
            : "Please select consecutive delivery dates (Sun+Tue or Tue+Sun)")
      )
    }

    const cartByDate: Record<string, CartItem[]> = {}
    const invalidItems: CartItem[] = []

    cart.forEach((item) => {
      const deliveryDay = currentDeliveryDays.find(
        (day) => day.id === item.dayId && day.weekOffset === item.weekOffset
      )

      if (!deliveryDay) {
        invalidItems.push(item)
        return
      }

      if (!cartByDate[deliveryDay.date]) {
        cartByDate[deliveryDay.date] = []
      }
      cartByDate[deliveryDay.date].push(item)
    })

    if (invalidItems.length > 0) {
      throw new Error(
        language === "zh"
          ? "配送日期已更新，请刷新页面重新选择餐点"
          : "Delivery schedule has been updated. Please refresh the page and re-select your meals."
      )
    }

    let totalRemainingCredits = userCredits
    let totalRemainingSixMeals = freshUser.weeklySIXmeals || 0
    let totalRemainingEightMeals = freshUser.weeklyEIGHTmeals || 0
    let totalRemainingTenMeals = freshUser.weeklyTENmeals || 0
    let totalRemainingTwelveMeals = freshUser.weeklyTWELVEmeals || 0
    let totalRemainingSixteenMeals = freshUser.weeklySIXTEENmeals || 0

    const totalItemsAcrossAllDates = Object.values(cartByDate)
      .flat()
      .reduce((total, item) => total + item.quantity, 0)

    const selectedMealPlanType = getSelectedMealPlanType(totalItemsAcrossAllDates, freshUser)

    const hasEnoughMeals =
      (selectedMealPlanType === "6aweek" && totalRemainingSixMeals >= 1) ||
      (selectedMealPlanType === "8aweek" && totalRemainingEightMeals >= 1) ||
      (selectedMealPlanType === "10aweek" && totalRemainingTenMeals >= 1) ||
      (selectedMealPlanType === "12aweek" && totalRemainingTwelveMeals >= 1) ||
      (selectedMealPlanType === "16aweek" && totalRemainingSixteenMeals >= 1)

    if (!hasEnoughMeals) {
      throw new Error(
        language === "zh" ? "餐券不足，请先购买餐券" : "Insufficient meal plans, please purchase more"
      )
    }

    const orderResults: unknown[] = []
    const sortedDates = Object.keys(cartByDate).sort()
    const isSplitWeeklyCheckout = sortedDates.length > 1
    const weeklyEntitlementGroupId = isSplitWeeklyCheckout
      ? `weg-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`
      : undefined

    if (sortedDates.length > 0) {
      const firstDate = sortedDates[0]
      const firstResult = await submitUserSubscription({
        items: cartByDate[firstDate],
        userId: currentUser._id,
        specialInstructions: formData.specialInstructions,
        deliveryAddress,
        phoneNumber: formData.phone,
        area: formData.area,
        mealPlanType: selectedMealPlanType,
        deductVoucher: true,
        weeklyEntitlementGroupId,
        weeklyEntitlementTotalMeals: isSplitWeeklyCheckout ? totalItems : undefined,
        splitDeliveryCount: isSplitWeeklyCheckout ? sortedDates.length : undefined,
      })

      if (firstResult.error) {
        throw new Error(firstResult.error)
      }

      if (firstResult.voucherDeducted) {
        if (firstResult.updatedUser) {
          if (firstResult.usedMealPlanType === "6aweek") {
            totalRemainingSixMeals = firstResult.updatedUser.weeklySIXmeals
          } else if (firstResult.usedMealPlanType === "8aweek") {
            totalRemainingEightMeals = firstResult.updatedUser.weeklyEIGHTmeals
          } else if (firstResult.usedMealPlanType === "10aweek") {
            totalRemainingTenMeals = firstResult.updatedUser.weeklyTENmeals
          } else if (firstResult.usedMealPlanType === "12aweek") {
            totalRemainingTwelveMeals = firstResult.updatedUser.weeklyTWELVEmeals
          } else if (firstResult.usedMealPlanType === "16aweek") {
            totalRemainingSixteenMeals = firstResult.updatedUser.weeklySIXTEENmeals
          } else {
            totalRemainingCredits = firstResult.updatedUser.credits
          }
        } else if (firstResult.remainingCredits !== undefined) {
          totalRemainingCredits = firstResult.remainingCredits
        }
      }

      orderResults.push(firstResult)

      for (let index = 1; index < sortedDates.length; index += 1) {
        const result = await submitUserSubscription({
          items: cartByDate[sortedDates[index]],
          userId: currentUser._id,
          specialInstructions: formData.specialInstructions,
          deliveryAddress,
          phoneNumber: formData.phone,
          area: formData.area,
          mealPlanType: selectedMealPlanType,
          deductVoucher: false,
          weeklyEntitlementGroupId,
          weeklyEntitlementTotalMeals: totalItems,
          splitDeliveryCount: sortedDates.length,
        })

        if (result.error) {
          throw new Error(result.error)
        }

        orderResults.push(result)
      }
    }

    const updatedUser = {
      ...currentUser,
      credits: totalRemainingCredits,
      weeklySIXmeals: totalRemainingSixMeals,
      weeklyEIGHTmeals: totalRemainingEightMeals,
      weeklyTENmeals: totalRemainingTenMeals,
      weeklyTWELVEmeals: totalRemainingTwelveMeals,
      weeklySIXTEENmeals: totalRemainingSixteenMeals,
    }

    mergeStoredUser({
      credits: totalRemainingCredits,
      weeklySIXmeals: totalRemainingSixMeals,
      weeklyEIGHTmeals: totalRemainingEightMeals,
      weeklyTENmeals: totalRemainingTenMeals,
      weeklyTWELVEmeals: totalRemainingTwelveMeals,
      weeklySIXTEENmeals: totalRemainingSixteenMeals,
    })

    setUserCredits(totalRemainingCredits)
    setWeeklySIXmeals(totalRemainingSixMeals)
    setWeeklyEIGHTmeals(totalRemainingEightMeals)
    setWeeklyTENmeals(totalRemainingTenMeals)
    setWeeklyTWELVEmeals(totalRemainingTwelveMeals)
    setWeeklySIXTEENmeals(totalRemainingSixteenMeals)

    if (userData) {
      Object.assign(userData, updatedUser)
    }

    await sendWeeklyOrderSummaryEmail(orderResults)

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
    console.error("Error during weekly checkout:", error)
    toast({
      title: language === "zh" ? "订单失败" : "Order Failed",
      description: language === "zh" ? "处理您的订单时出错" : "Error processing your order",
      variant: "destructive",
    })
    setIsLoading(false)
    throw error
  }
}

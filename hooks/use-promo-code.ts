"use client"

import { useEffect, useState } from "react"

import {
  normalizePromoCode,
  type PricingBreakdown,
  type PromoPaymentMethod,
  type PromoPurchaseType,
} from "@/lib/promo-code-shared"

type PromoCodePreviewRequest = {
  userId?: string | null
  purchaseType: PromoPurchaseType
  paymentMethod: PromoPaymentMethod
  mealSubtotal: number
  deliveryFeeTotal: number
  taxRate: number
}

type UsePromoCodeOptions = {
  language: "en" | "zh"
  request: PromoCodePreviewRequest | null
  resetKeys?: readonly unknown[]
  availabilityError?: string | null
  missingUserError?: string
  onApplySuccess?: (code: string) => void
}

export function usePromoCode({
  language,
  request,
  resetKeys = [],
  availabilityError,
  missingUserError,
  onApplySuccess,
}: UsePromoCodeOptions) {
  const [promoCodeInput, setPromoCodeInput] = useState("")
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoBreakdown, setPromoBreakdown] = useState<PricingBreakdown | null>(null)
  const [promoError, setPromoError] = useState("")
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)

  const resetPromo = () => {
    setAppliedPromoCode(null)
    setPromoBreakdown(null)
    setPromoError("")
  }

  const handleRemovePromo = () => {
    resetPromo()
    setPromoCodeInput("")
  }

  const handleApplyPromo = async () => {
    if (!request) {
      setPromoError(
        missingUserError || (language === "zh" ? "请先登录" : "Please log in first")
      )
      return
    }

    if (!request.userId) {
      setPromoError(
        missingUserError || (language === "zh" ? "请先登录" : "Please log in first")
      )
      return
    }

    if (availabilityError) {
      setPromoError(availabilityError)
      return
    }

    const code = normalizePromoCode(promoCodeInput)
    if (!code) {
      setPromoError(language === "zh" ? "请输入优惠码" : "Please enter a promo code")
      return
    }

    setIsApplyingPromo(true)
    setPromoError("")

    try {
      const response = await fetch("/api/promo-codes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          code,
          userId: request.userId,
        }),
      })

      const result = (await response.json()) as {
        success?: boolean
        error?: string
        data?: {
          breakdown?: PricingBreakdown
        }
      }

      if (!response.ok || !result.success || !result.data?.breakdown) {
        throw new Error(result.error || "Failed to apply promo code")
      }

      setPromoBreakdown(result.data.breakdown)
      setAppliedPromoCode(code)
      setPromoCodeInput(code)
      onApplySuccess?.(code)
    } catch (error) {
      setAppliedPromoCode(null)
      setPromoBreakdown(null)
      setPromoError(
        error instanceof Error
          ? error.message
          : language === "zh"
            ? "优惠码无效"
            : "Invalid promo code"
      )
    } finally {
      setIsApplyingPromo(false)
    }
  }

  useEffect(() => {
    resetPromo()
  }, resetKeys)

  return {
    promoCodeInput,
    setPromoCodeInput,
    appliedPromoCode,
    promoBreakdown,
    promoError,
    isApplyingPromo,
    handleApplyPromo,
    handleRemovePromo,
    resetPromo,
  }
}

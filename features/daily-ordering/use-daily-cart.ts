"use client"

import { useMemo, useState } from "react"

import type { CartItem, ComboItem } from "@/lib/daily-delivery"

type UseDailyCartParams = {
  isDayUnavailable: (day: string) => { unavailable: boolean; reason: string }
  onUnavailableDayAttempt?: (reason: string) => void
}

export function useDailyCart({
  isDayUnavailable,
  onUnavailableDayAttempt,
}: UseDailyCartParams) {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (
    day: string,
    date: string,
    combo: ComboItem,
    type: "A" | "B"
  ) => {
    const { unavailable, reason } = isDayUnavailable(day)

    if (unavailable) {
      onUnavailableDayAttempt?.(reason)
      return
    }

    const existingItemIndex = cart.findIndex(
      (item) => item.day === day && item.comboId === combo.id && item.type === type
    )

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += 1
      setCart(updatedCart)
      return
    }

    setCart([
      ...cart,
      {
        day,
        date,
        comboId: combo.id,
        comboName: combo.name,
        type,
        quantity: 1,
        voucherType: type === "A" ? "twoDish" : "threeDish",
      },
    ])
  }

  const removeFromCart = (day: string, combo: ComboItem, type: "A" | "B") => {
    const existingItemIndex = cart.findIndex(
      (item) => item.day === day && item.comboId === combo.id && item.type === type
    )

    if (existingItemIndex < 0) {
      return
    }

    const updatedCart = [...cart]
    if (updatedCart[existingItemIndex].quantity > 1) {
      updatedCart[existingItemIndex].quantity -= 1
      setCart(updatedCart)
      return
    }

    setCart(cart.filter((_, index) => index !== existingItemIndex))
  }

  const getQuantityInCart = (day: string, comboId: string, type: "A" | "B") => {
    const item = cart.find(
      (candidate) =>
        candidate.day === day && candidate.comboId === comboId && candidate.type === type
    )
    return item ? item.quantity : 0
  }

  const totalVouchers = useMemo(() => {
    return cart.reduce(
      (totals, item) => {
        if (item.voucherType === "twoDish") {
          totals.twoDish += item.quantity
        } else {
          totals.threeDish += item.quantity
        }
        return totals
      },
      { twoDish: 0, threeDish: 0 }
    )
  }, [cart])

  const totalItems = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  )

  return {
    addToCart,
    cart,
    getQuantityInCart,
    removeFromCart,
    setCart,
    totalItems,
    totalVouchers,
  }
}

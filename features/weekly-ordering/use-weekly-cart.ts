"use client"

import { useMemo, useState } from "react"

import type { CartItem, DeliveryDay } from "@/lib/weekly-subscription"

type DayAvailability = {
  unavailable: boolean
  reason: string
}

type UseWeeklyCartParams = {
  deliveryDays: DeliveryDay[]
  isDayUnavailable: (day: DeliveryDay) => DayAvailability
}

export function useWeeklyCart({
  deliveryDays,
  isDayUnavailable,
}: UseWeeklyCartParams) {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (dayId: string, optionId: string, weekOffset?: number) => {
    const day =
      weekOffset !== undefined
        ? deliveryDays.find((candidate) => candidate.id === dayId && candidate.weekOffset === weekOffset)
        : deliveryDays.find((candidate) => candidate.id === dayId)

    if (day) {
      isDayUnavailable(day)
    }

    const existingItemIndex = cart.findIndex(
      (item) =>
        item.dayId === dayId &&
        item.optionId === optionId &&
        item.weekOffset === day?.weekOffset
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
        dayId,
        optionId,
        quantity: 1,
        weekOffset: day?.weekOffset,
      },
    ])
  }

  const removeFromCart = (dayId: string, optionId: string, weekOffset?: number) => {
    const day =
      weekOffset !== undefined
        ? deliveryDays.find((candidate) => candidate.id === dayId && candidate.weekOffset === weekOffset)
        : deliveryDays.find((candidate) => candidate.id === dayId)

    const existingItemIndex = cart.findIndex(
      (item) =>
        item.dayId === dayId &&
        item.optionId === optionId &&
        item.weekOffset === day?.weekOffset
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

  const getQuantityInCart = (dayId: string, optionId: string, weekOffset?: number) => {
    const day =
      weekOffset !== undefined
        ? deliveryDays.find((candidate) => candidate.id === dayId && candidate.weekOffset === weekOffset)
        : deliveryDays.find((candidate) => candidate.id === dayId)

    const item = cart.find(
      (candidate) =>
        candidate.dayId === dayId &&
        candidate.optionId === optionId &&
        candidate.weekOffset === day?.weekOffset
    )

    return item ? item.quantity : 0
  }

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
    totalCredits: totalItems,
    totalItems,
  }
}

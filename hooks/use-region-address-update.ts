"use client"

import { useToast } from "@/hooks/use-toast"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { useLanguage } from "@/lib/language-context"
import { getStoredUser } from "@/lib/phone-helper"
import type { AddressGeo } from "@/lib/contracts/common"

type AddressUpdateInput = {
  unitNumber?: string
  streetAddress?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  buzzCode?: string
  addressGeo?: AddressGeo
}

type UseRegionAddressUpdateOptions = {
  userId?: string | null
  defaultCountry?: string
  onSuccess?: (region: string) => void
}

export function useRegionAddressUpdate({
  userId,
  defaultCountry = "Canada",
  onSuccess,
}: UseRegionAddressUpdateOptions = {}) {
  const { language } = useLanguage()
  const { toast } = useToast()

  const handleRegionChange = async (region: string, addressData?: AddressUpdateInput) => {
    try {
      const storedUser = getStoredUser()
      const effectiveUserId = userId || storedUser?._id

      if (!effectiveUserId) {
        throw new Error("User not logged in")
      }

      let updatedAddress = {
        ...(storedUser?.address || {}),
        province: region,
      }

      if (addressData) {
        updatedAddress = {
          ...updatedAddress,
          unitNumber:
            addressData.unitNumber !== undefined
              ? addressData.unitNumber
              : updatedAddress.unitNumber,
          streetAddress:
            addressData.streetAddress !== undefined
              ? addressData.streetAddress
              : updatedAddress.streetAddress,
          city: addressData.city !== undefined ? addressData.city : updatedAddress.city,
          postalCode:
            addressData.postalCode !== undefined
              ? addressData.postalCode
              : updatedAddress.postalCode,
          country:
            addressData.country !== undefined ? addressData.country : defaultCountry,
          buzzCode:
            addressData.buzzCode !== undefined
              ? addressData.buzzCode
              : updatedAddress.buzzCode,
        }
      }

      const hasGeo = Boolean(addressData?.addressGeo)
      const url = hasGeo
        ? `/api/users/${effectiveUserId}/verify-address`
        : `/api/users/${effectiveUserId}`
      const body = hasGeo
        ? JSON.stringify({
            address: updatedAddress,
            addressGeo: addressData!.addressGeo,
          })
        : JSON.stringify({ address: updatedAddress })

      const response = await fetch(url, {
        method: hasGeo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to update region")
      }

      mergeStoredUser(result.data ?? { address: updatedAddress })
      onSuccess?.(region)

      const toastMessage = addressData
        ? language === "zh"
          ? "地址已更新"
          : "Address Updated"
        : language === "zh"
          ? "区域已更新"
          : "Region Updated"

      const toastDescription = addressData
        ? language === "zh"
          ? "您的配送地址已成功更新"
          : "Your delivery address has been successfully updated"
        : language === "zh"
          ? "您的区域已成功更新"
          : "Your region has been successfully updated"

      toast({
        title: toastMessage,
        description: toastDescription,
      })
    } catch (error) {
      console.error("Error updating region:", error)
      toast({
        title: language === "zh" ? "更新失败" : "Update Failed",
        description:
          error instanceof Error
            ? error.message
            : language === "zh"
              ? "更新地址时出现错误"
              : "An error occurred while updating your address",
        variant: "destructive",
      })
      throw error
    }
  }

  return {
    handleRegionChange,
  }
}

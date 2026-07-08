"use client"

import { useEffect, useState } from "react"

import type { CheckoutAddressFormData } from "@/components/checkout-address-form"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { useOptionalUserProfile } from "@/lib/dashboard-user-profile"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import { canDeliverDaily, resolveServiceability } from "@/lib/zones/service-areas"

export type DailyCheckoutFormData = {
  name: string
  phone: string
  area: string
  specialInstructions: string
}

const INITIAL_FORM_DATA: DailyCheckoutFormData = {
  name: "",
  phone: "",
  area: "",
  specialInstructions: "",
}

const INITIAL_ADDRESS_FORM_DATA: CheckoutAddressFormData = {
  unitNumber: "",
  streetAddress: "",
  province: "",
  postalCode: "",
  country: "Canada",
  buzzCode: "",
}

type UseDailyCheckoutStateOptions = {
  deliveryRegions: readonly string[]
}

export function useDailyCheckoutState({
  deliveryRegions,
}: UseDailyCheckoutStateOptions) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const sharedUserProfile = useOptionalUserProfile()

  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState<DailyCheckoutFormData>(INITIAL_FORM_DATA)
  const [addressFormData, setAddressFormData] = useState<CheckoutAddressFormData>(
    INITIAL_ADDRESS_FORM_DATA
  )
  const [editingAddress, setEditingAddress] = useState(false)
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true)
  const [isValidDeliveryArea, setIsValidDeliveryArea] = useState(true)

  useEffect(() => {
    const applyUserToForm = (user: any) => {
      setUserData(user)
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        area: user.area || user.address?.province || "",
        specialInstructions: "",
      })

      if (user.address) {
        setAddressFormData({
          unitNumber: user.address.unitNumber || "",
          streetAddress: user.address.streetAddress || "",
          province: user.address.province || "",
          postalCode: user.address.postalCode || "",
          country: user.address.country || "Canada",
          buzzCode: user.address.buzzCode || "",
          addressGeo: user.addressGeo,
        })
        const userArea = user.address.province || ""
        setIsValidDeliveryArea(canDeliverDaily(userArea, user.addressGeo?.postalCode || user.address.postalCode))
      } else {
        setIsValidDeliveryArea(false)
      }
    }

    if (sharedUserProfile) {
      if (sharedUserProfile.userData) {
        applyUserToForm(sharedUserProfile.userData)
      } else {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser)
            applyUserToForm(user)
          } catch {
            /* ignore */
          }
        }
      }
      return
    }

    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      applyUserToForm(user)

      const needsAddress = !user.address || !user.address.streetAddress
      if (user._id && needsAddress) {
        fetch(`/api/users/${user._id}`)
          .then((res) => res.json())
          .then((result) => {
            if (result?.success && result?.data) {
              const fullUser = result.data
              applyUserToForm(fullUser)
              mergeStoredUser({
                ...user,
                address: fullUser.address,
                phone: fullUser.phone,
                area: fullUser.area || fullUser.address?.province,
              })
            }
          })
          .catch(() => {})
      }
    }
  }, [deliveryRegions, sharedUserProfile?.userData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((current) => ({
      ...current,
      [id]: value,
    }))
  }

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setAddressFormData((current) => ({
      ...current,
      [id === "state" ? "province" : id === "zip" ? "postalCode" : id]: value,
      ...(id === "streetAddress" ? { addressGeo: undefined, postalCode: "" } : {}),
    }))
  }

  const handleAddressSelect = (result: ParsedGoogleAddress) => {
    const serviceability = resolveServiceability({
      areaLabel: result.address.province,
      postalCode: result.addressGeo.postalCode || result.address.postalCode,
    })
    if (!serviceability.canDaily) {
      toast({
        title: language === "zh" ? "地址不在服务范围内" : "Address outside service area",
        description:
          language === "zh"
            ? serviceability.canWeekly
              ? "此地址目前不支持每日配送，但可以使用周餐盒服务。"
              : "此地址不在配送范围内，请选择服务区域内的地址。"
            : serviceability.canWeekly
              ? "Daily delivery is not available at this address yet, but weekly meal box is available."
              : "This address is not within Kapioo's delivery area. Please select an address in a supported area.",
        variant: "destructive",
      })
      setAddressFormData((current) => ({ ...current, streetAddress: "", addressGeo: undefined, postalCode: "" }))
      return
    }
    setAddressFormData((current) => ({
      ...current,
      streetAddress: result.address.streetAddress || "",
      postalCode: result.addressGeo.postalCode || result.address.postalCode || "",
      country: result.address.country || "Canada",
      province: result.address.province || "",
      addressGeo: result.addressGeo,
    }))
  }

  const handleSaveAddress = async () => {
    const selectedArea = addressFormData.province
    const isValid = canDeliverDaily(
      selectedArea,
      addressFormData.addressGeo?.postalCode || addressFormData.postalCode
    )
    setIsValidDeliveryArea(isValid)

    if (!isValid) {
      toast({
        title: language === "zh" ? "地址不在服务范围内" : "Address outside service area",
        description: language === "zh"
          ? "此地址目前不支持每日配送，请选择服务区域内的地址。"
          : "Daily delivery is not available at this address. Please select a supported address.",
        variant: "destructive",
      })
      return
    }

    setUserData((prev: any) =>
      prev
        ? {
            ...prev,
            address: { ...addressFormData },
          }
        : null
    )

    if (saveAddressForFuture && userData?._id) {
      try {
        if (!addressFormData.addressGeo) {
          toast({
            title: language === "zh" ? "请选择 Google 地址" : "Select a Google address",
            description:
              language === "zh"
                ? "保存常用地址前，请从地址建议中选择配送地址。"
                : "Please choose an address from the suggestions before saving it for future orders.",
            variant: "destructive",
          })
          return
        }

        const response = await fetch(`/api/users/${userData._id}/verify-address`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: {
              unitNumber: addressFormData.unitNumber,
              streetAddress: addressFormData.streetAddress,
              province: addressFormData.province,
              postalCode: addressFormData.postalCode,
              country: addressFormData.country || "Canada",
              buzzCode: addressFormData.buzzCode,
            },
            addressGeo: addressFormData.addressGeo,
          }),
        })

        const result = await response.json()

        if (result.success) {
          mergeStoredUser(result.data)

          toast({
            title: language === "zh" ? "地址已保存" : "Address Saved",
            description: language === "zh" ? "您的地址已更新" : "Your address has been updated",
          })
        } else {
          toast({
            title: language === "zh" ? "出错了" : "Error Occurred",
            description:
              result.error ||
              (language === "zh" ? "保存地址时出错" : "Error saving address"),
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error saving address:", error)
        toast({
          title: language === "zh" ? "出错了" : "Error Occurred",
          description: language === "zh" ? "保存地址时出错" : "Error saving address",
          variant: "destructive",
        })
      }
    }

    setEditingAddress(false)
  }

  return {
    userData,
    setUserData,
    formData,
    setFormData,
    addressFormData,
    editingAddress,
    saveAddressForFuture,
    isValidDeliveryArea,
    setEditingAddress,
    setSaveAddressForFuture,
    handleInputChange,
    handleAddressInputChange,
    handleAddressSelect,
    handleSaveAddress,
  }
}

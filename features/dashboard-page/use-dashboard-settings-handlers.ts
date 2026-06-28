"use client"

import type React from "react"
import { useCallback, type Dispatch, type SetStateAction } from "react"

import type { useToast } from "@/hooks/use-toast"
import type { useLanguage } from "@/lib/language-context"
import type { DashboardUserData } from "@/lib/dashboard-user-profile"
import type {
  DashboardAddressInfo,
  DashboardPasswordInfo,
  DashboardPersonalInfo,
} from "@/features/dashboard-settings/dashboard-settings-tab"
import type { ParsedGoogleAddress } from "@/lib/address/types"

type TFn = ReturnType<typeof useLanguage>["t"]
type ToastFn = ReturnType<typeof useToast>["toast"]

interface UseDashboardSettingsHandlersParams {
  userData: DashboardUserData | null
  personalInfo: DashboardPersonalInfo
  addressInfo: DashboardAddressInfo
  passwordInfo: DashboardPasswordInfo
  applyUserProfile: (
    user: Partial<DashboardUserData>,
    options?: { syncForms?: boolean }
  ) => void
  toast: ToastFn
  t: TFn
  setPersonalInfo: Dispatch<SetStateAction<DashboardPersonalInfo>>
  setAddressInfo: Dispatch<SetStateAction<DashboardAddressInfo>>
  setPasswordInfo: Dispatch<SetStateAction<DashboardPasswordInfo>>
}

export function useDashboardSettingsHandlers({
  userData,
  personalInfo,
  addressInfo,
  passwordInfo,
  applyUserProfile,
  toast,
  t,
  setPersonalInfo,
  setAddressInfo,
  setPasswordInfo,
}: UseDashboardSettingsHandlersParams) {
  const handlePersonalInfoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target
      setPersonalInfo((prev) => ({
        ...prev,
        [id]: value,
      }))
    },
    [setPersonalInfo]
  )

  const handleAddressInfoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target
      setAddressInfo((prev) => ({
        ...prev,
        [id === "state" ? "province" : id === "zip" ? "postalCode" : id]: value,
        // Clear geo when the user manually types a new street address so the gate blocks a bad save
        ...(id === "streetAddress" ? { addressGeo: undefined } : {}),
      }))
    },
    [setAddressInfo]
  )

  const handleAddressGeoSelect = useCallback(
    (result: ParsedGoogleAddress) => {
      if (!result.address.province) {
        toast({
          title: "Address outside service area",
          description:
            "This address is not within Kapioo's delivery area. Please select an address in a supported area.",
          variant: "destructive",
        })
        setAddressInfo((prev) => ({ ...prev, streetAddress: "", addressGeo: undefined }))
        return
      }
      setAddressInfo((prev) => ({
        ...prev,
        streetAddress: result.address.streetAddress || prev.streetAddress,
        postalCode: result.address.postalCode || prev.postalCode,
        country: result.address.country || "Canada",
        province: result.address.province,
        addressGeo: result.addressGeo,
      }))
    },
    [setAddressInfo, toast]
  )

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target
      setPasswordInfo((prev) => ({
        ...prev,
        [id === "current-password"
          ? "currentPassword"
          : id === "new-password"
            ? "newPassword"
            : id === "confirm-password"
              ? "confirmPassword"
              : id]: value,
      }))
    },
    [setPasswordInfo]
  )

  const handleSavePersonalInfo = useCallback(async () => {
    if (!userData?._id) return

    try {
      const response = await fetch(`/api/users/${userData._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: personalInfo.name,
          nickname: personalInfo.nickname,
          email: personalInfo.email,
          phone: personalInfo.phone,
          languagePreference: personalInfo.languagePreference,
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        applyUserProfile(result.data as DashboardUserData, { syncForms: true })
        toast({
          title: t("changesSaved"),
          description: t("personalInfoSaved"),
        })
      } else {
        toast({
          title: t("errorOccurred"),
          description: result.error || t("personalInfoError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating personal info:", error)
      toast({
        title: t("errorOccurred"),
        description: t("personalInfoError"),
        variant: "destructive",
      })
    }
  }, [applyUserProfile, personalInfo, t, toast, userData?._id])

  const handleSaveAddressInfo = useCallback(async () => {
    if (!userData?._id) return

    if (!addressInfo.addressGeo) {
      toast({
        title: t("errorOccurred"),
        description: "Please select your street address from the Google suggestions to ensure accurate delivery.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/users/${userData._id}/verify-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            unitNumber: addressInfo.unitNumber,
            streetAddress: addressInfo.streetAddress,
            province: addressInfo.province,
            postalCode: addressInfo.postalCode,
            country: addressInfo.country || "Canada",
            buzzCode: addressInfo.buzzCode,
          },
          addressGeo: addressInfo.addressGeo,
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        applyUserProfile(result.data as DashboardUserData, { syncForms: true })
        toast({
          title: t("changesSaved"),
          description: t("addressSaved"),
        })
      } else {
        toast({
          title: t("errorOccurred"),
          description: result.error || t("addressError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating address:", error)
      toast({
        title: t("errorOccurred"),
        description: t("addressError"),
        variant: "destructive",
      })
    }
  }, [addressInfo, applyUserProfile, t, toast, userData?._id])

  const handleSavePassword = useCallback(async () => {
    if (!userData?._id) return

    if (!passwordInfo.currentPassword) {
      toast({
        title: t("errorOccurred"),
        description: t("passwordRequired"),
        variant: "destructive",
      })
      return
    }

    if (!passwordInfo.newPassword) {
      toast({
        title: t("errorOccurred"),
        description: t("newPasswordRequired"),
        variant: "destructive",
      })
      return
    }

    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      toast({
        title: t("errorOccurred"),
        description: t("passwordMismatch"),
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/users/${userData._id}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordInfo.currentPassword,
          newPassword: passwordInfo.newPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPasswordInfo({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })

        toast({
          title: t("changesSaved"),
          description: t("passwordChanged"),
        })
      } else {
        toast({
          title: t("errorOccurred"),
          description: result.error || t("passwordError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: t("errorOccurred"),
        description: t("passwordError"),
        variant: "destructive",
      })
    }
  }, [passwordInfo, setPasswordInfo, t, toast, userData?._id])

  return {
    handlePersonalInfoChange,
    handleAddressInfoChange,
    handleAddressGeoSelect,
    handlePasswordChange,
    handleSavePersonalInfo,
    handleSaveAddressInfo,
    handleSavePassword,
  }
}

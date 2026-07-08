"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Check, ChevronsUpDown } from "lucide-react"

import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AddressGeo } from "@/lib/contracts/common"
import { ALL_WEEKLY_AREAS } from "@/lib/constants/areas"
import type { useLanguage } from "@/lib/language-context"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import { cn } from "@/lib/utils"

export type DashboardPersonalInfo = {
  name: string
  nickname: string
  email: string
  phone: string
  languagePreference: "zh" | "en"
}

export type DashboardAddressInfo = {
  unitNumber: string
  streetAddress: string
  province: string
  postalCode: string
  country: string
  buzzCode: string
  addressGeo?: AddressGeo
}

export type DashboardPasswordInfo = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface DashboardSettingsTabProps {
  language: "en" | "zh"
  t: ReturnType<typeof useLanguage>["t"]
  userStatus?: string
  userId?: string
  personalInfo: DashboardPersonalInfo
  addressInfo: DashboardAddressInfo
  passwordInfo: DashboardPasswordInfo
  onPersonalInfoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onAddressInfoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onLanguagePreferenceChange: (languagePreference: "zh" | "en") => void
  onAddressProvinceChange: (province: string) => void
  onAddressGeoSelect: (result: ParsedGoogleAddress) => void
  onSavePersonalInfo: () => void
  onSaveAddressInfo: () => void
  onSavePassword: () => void
}

function isValidDeliveryArea(area: string) {
  return ALL_WEEKLY_AREAS.includes(area as (typeof ALL_WEEKLY_AREAS)[number])
}

export function DashboardSettingsTab({
  language,
  t,
  userStatus,
  userId,
  personalInfo,
  addressInfo,
  passwordInfo,
  onPersonalInfoChange,
  onAddressInfoChange,
  onPasswordChange,
  onLanguagePreferenceChange,
  onAddressProvinceChange,
  onAddressGeoSelect,
  onSavePersonalInfo,
  onSaveAddressInfo,
  onSavePassword,
}: DashboardSettingsTabProps) {
  return (
    <motion.div
      key="settings"
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      exit={{ y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("accountSettings")}</h2>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">{t("personalInfoTab")}</TabsTrigger>
          <TabsTrigger value="password">{t("passwordTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("personalInformation")}</CardTitle>
              <CardDescription>{t("updateAccountDetails")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center mb-4 p-3 bg-muted rounded-md">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t("accountStatus")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${userStatus === "Active" ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm font-medium">{userStatus || "Unknown"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userId">{t("userId")}</Label>
                  <Input id="userId" value={userId || ""} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input id="name" value={personalInfo.name} onChange={onPersonalInfoChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">{t("nickname")}</Label>
                  <Input id="nickname" value={personalInfo.nickname} onChange={onPersonalInfoChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" type="email" value={personalInfo.email} onChange={onPersonalInfoChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input id="phone" value={personalInfo.phone} onChange={onPersonalInfoChange} />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="languagePreference">{t("preferredLanguage")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onLanguagePreferenceChange("zh")}
                    className={cn(
                      "h-11 px-4 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                      personalInfo.languagePreference === "zh"
                        ? "border-[#C2884E] bg-[#FFF6EF] text-[#C2884E] font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <span className="text-sm">中文</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguagePreferenceChange("en")}
                    className={cn(
                      "h-11 px-4 rounded-md border-2 transition-all duration-200 flex items-center justify-center gap-2",
                      personalInfo.languagePreference === "en"
                        ? "border-[#C2884E] bg-[#FFF6EF] text-[#C2884E] font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <span className="text-xl">🇨🇦</span>
                    <span className="text-sm">English</span>
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onSavePersonalInfo}>{t("saveChanges")}</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("deliveryAddressTitle")}</CardTitle>
              <CardDescription>{t("updateDeliveryInfo")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">{t("unitAptNumber")}</Label>
                  <Input id="unitNumber" value={addressInfo.unitNumber} onChange={onAddressInfoChange} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("streetAddress")}</Label>
                  <AddressAutocomplete
                    value={addressInfo.streetAddress}
                    language={language}
                    onInputChange={(value) =>
                      onAddressInfoChange({
                        target: { id: "streetAddress", value },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                    onAddressSelect={onAddressGeoSelect}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="state">{t("state")}</Label>
                    {addressInfo.province && !isValidDeliveryArea(addressInfo.province) && (
                      <span className="text-red-500 text-xs">
                        ({language === "zh" ? "请选择有效的配送区域" : "Please select a valid delivery area"})
                      </span>
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          addressInfo.province && !isValidDeliveryArea(addressInfo.province) && "border-red-500"
                        )}
                      >
                        {addressInfo.province || "Select an area..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-full">
                      <Command>
                        <CommandInput placeholder="Search area..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>No area found.</CommandEmpty>
                          <CommandGroup>
                            {ALL_WEEKLY_AREAS.map((area) => (
                              <CommandItem
                                key={area}
                                value={area}
                                onSelect={() => onAddressProvinceChange(area)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    addressInfo.province === area ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {area}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">{t("zipCode")}</Label>
                  <GoogleDerivedPostalCodeInput
                    id="zip"
                    value={addressInfo.postalCode}
                    language={language}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buzzCode" className="text-sm">
                    {t("buzzCodeLabel")} <span className="text-muted-foreground text-xs">{t("buzzCodeOptional")}</span>
                  </Label>
                  <Input
                    id="buzzCode"
                    value={addressInfo.buzzCode}
                    onChange={onAddressInfoChange}
                    placeholder={t("buzzCodePlaceholder")}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onSaveAddressInfo}>{t("saveChanges")}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("passwordTab")}</CardTitle>
              <CardDescription>{t("changePassword")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t("currentPasswordLabel")}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordInfo.currentPassword}
                    onChange={onPasswordChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("newPasswordLabel")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordInfo.newPassword}
                    onChange={onPasswordChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("confirmPasswordLabel")}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordInfo.confirmPassword}
                    onChange={onPasswordChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onSavePassword}>{t("changePasswordBtn")}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

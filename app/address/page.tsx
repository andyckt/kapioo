"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { GoogleDerivedAreaInput } from "@/components/google-derived-area-input"
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { useLanguage } from "@/lib/language-context"
import { useAddressSelection } from "@/hooks/use-address-selection"

export default function AddressPage() {
  const [unitNumber, setUnitNumber] = useState("")
  const [buzzCode, setBuzzCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()

  const { address, handleAddressSelect, handleStreetInputChange } = useAddressSelection({
    service: "any",
    language,
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.replace('/login')
      }
    } else {
      router.replace('/login')
    }
  }, [router])

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address.streetAddress || !address.postalCode || !address.province || !address.addressGeo) {
      toast({
        title: language === "zh" ? "信息不完整" : "Missing information",
        description: language === "zh"
          ? "请从地址建议中选择一个地址"
          : "Please select an address from the suggestions",
        variant: "destructive",
      })
      return
    }

    if (!user) return
    
    setIsLoading(true)

    try {
      const response = await fetch(`/api/users/${user._id || user.userID}/verify-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            unitNumber,
            streetAddress: address.streetAddress,
            postalCode: address.postalCode,
            province: address.province,
            country: "Canada",
            buzzCode,
          },
          addressGeo: address.addressGeo,
        }),
      });

      const result = await response.json();

      if (result.success) {
        mergeStoredUser(result.data);
        toast({
          title: language === "zh" ? "地址已保存" : "Address saved",
          description: language === "zh" ? "配送地址已成功保存" : "Your delivery address has been saved successfully",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: language === "zh" ? "保存失败" : "Failed to save address",
          description: result.error || (language === "zh" ? "请重试" : "Something went wrong"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: language === "zh" ? "保存失败" : "Failed to save address",
        description: language === "zh" ? "发生错误，请重试" : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff6ef]/50">
      <div className="container relative pt-4" />
      <div className="container flex flex-1 items-center justify-center py-10 md:py-14">
        <div className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[500px] animate-fade-in-up">
          <div className="flex flex-col items-center space-y-5 text-center">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image 
                src="/未命名設計.png" 
                alt="Kapioo Logo" 
                width={52} 
                height={52} 
                className="h-13 w-13 transition-transform duration-300 group-hover:rotate-6" 
              />
              <span className="inline-block font-bold text-[#C2884E] text-3xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
          
          <form onSubmit={handleSaveAddress} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
            <div className="grid gap-5">
              <div className="grid gap-2.5">
                <Label htmlFor="unitNumber" className="text-sm font-medium">
                  {language === "zh" ? "单元/公寓号" : "Unit Number"}
                </Label>
                <Input
                  id="unitNumber"
                  placeholder={language === "zh" ? "公寓、套房等" : "Apartment, suite, unit, etc."}
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                />
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="streetAddress" className="text-sm font-medium">
                  {language === "zh" ? "街道地址" : "Street Address"} <span className="text-red-500">*</span>
                </Label>
                <AddressAutocomplete
                  value={address.streetAddress}
                  language={language}
                  placeholder={language === "zh" ? "街道地址" : "Street address"}
                  disabled={isLoading}
                  onInputChange={handleStreetInputChange}
                  onAddressSelect={handleAddressSelect}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2.5">
                  <Label htmlFor="province" className="text-sm font-medium">
                    {language === "zh" ? "配送区域" : "Delivery Area"} <span className="text-red-500">*</span>
                  </Label>
                  <GoogleDerivedAreaInput
                    id="province"
                    value={address.province}
                    language={language}
                    disabled={isLoading}
                    className="h-11 text-base placeholder:text-sm"
                  />
                </div>
                
                <div className="grid gap-2.5">
                  <Label htmlFor="postalCode" className="text-sm font-medium">
                    {language === "zh" ? "邮编" : "ZIP Code"} <span className="text-red-500">*</span>
                  </Label>
                  <GoogleDerivedPostalCodeInput
                    id="postalCode"
                    value={address.postalCode}
                    language={language}
                    disabled={isLoading}
                    className="h-11 text-base placeholder:text-sm"
                  />
                </div>
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="buzzCode" className="text-sm font-medium">
                  {language === "zh" ? "门禁/蜂鸣码" : "Buzz/Entry Code"}
                </Label>
                <Input
                  id="buzzCode"
                  placeholder={language === "zh" ? "如有需要，用于进入建筑物" : "Buzz code for building access (if needed)"}
                  value={buzzCode}
                  onChange={(e) => setBuzzCode(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                />
              </div>
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
                  disabled={isLoading}
                >
                  {isLoading
                    ? (language === "zh" ? "保存中..." : "Saving...")
                    : (language === "zh" ? "保存地址" : "Save Address")}
                </Button>
              </div>
            </div>
          </form>
          
          <p className="text-xs text-center text-muted-foreground">
            {language === "zh"
              ? "您可以随时在账户设置中更新配送地址。"
              : "You can update your delivery address at any time from your account settings."}
          </p>
        </div>
      </div>
    </div>
  )
}
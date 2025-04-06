"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

export default function AddressPage() {
  const [user, setUser] = useState<any>(null)
  const [unitNumber, setUnitNumber] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [province, setProvince] = useState("")
  const [country, setCountry] = useState("")
  const [buzzCode, setBuzzCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({
    streetAddress: "",
    city: "",
    postalCode: "",
    province: "",
    country: "",
  })

  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user')
    if (!userData) {
      // No user found, redirect to signup
      router.push('/signup')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      // If user already has address details, pre-fill the form
      if (parsedUser.address) {
        setUnitNumber(parsedUser.address.unitNumber || "")
        setStreetAddress(parsedUser.address.streetAddress || "")
        setCity(parsedUser.address.city || "")
        setPostalCode(parsedUser.address.postalCode || "")
        setProvince(parsedUser.address.province || "")
        setCountry(parsedUser.address.country || "")
        setBuzzCode(parsedUser.address.buzzCode || "")
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      localStorage.removeItem('user')
      router.push('/signup')
    }
  }, [router])

  const validateForm = () => {
    let isValid = true
    const newErrors = {
      streetAddress: "",
      city: "",
      postalCode: "",
      province: "",
      country: "",
    }

    // Validate required fields
    if (!streetAddress.trim()) {
      newErrors.streetAddress = "Street address is required"
      isValid = false
    }

    if (!city.trim()) {
      newErrors.city = "City is required"
      isValid = false
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = "Postal code is required"
      isValid = false
    }

    if (!province.trim()) {
      newErrors.province = "Province/State is required"
      isValid = false
    }

    if (!country.trim()) {
      newErrors.country = "Country is required"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) {
      return
    }
    
    setIsLoading(true)

    try {
      // Call the API to update the user's address
      const response = await fetch(`/api/users/${user.userID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            unitNumber,
            streetAddress,
            city,
            postalCode,
            province,
            country,
            buzzCode,
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local storage with updated user data
        localStorage.setItem('user', JSON.stringify(result.data));
        
        // Show success toast
        toast({
          title: "Address saved successfully",
          description: "Your delivery address has been updated",
        });
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        // Show error toast
        toast({
          title: "Failed to save address",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        title: "Failed to save address",
        description: "An error occurred while saving your address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff6ef]/50">
      <header className="w-full py-2 px-3 flex items-center justify-between">
        <div className="container flex justify-between items-center">
          <Link 
            href="/signup" 
            className="hidden sm:inline-flex items-center text-xs font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Registration
          </Link>
        </div>
      </header>
      
      <div className="container flex flex-1 items-center justify-center py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[500px]"
        >
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
            <div>
              <h1 className="text-2xl font-bold">{t('deliveryAddress')}</h1>
              <p className="text-muted-foreground">{t('whereDeliver')}</p>
            </div>
            <div className="flex items-center space-x-3 w-full justify-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white">
                <Check className="h-5 w-5" />
              </div>
              <div className="flex-1 h-1 bg-primary max-w-[60px]"></div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white">
                2
              </div>
            </div>
          </div>
          
          <div className="grid gap-7">
            <form onSubmit={handleSubmit} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
              <div className="grid gap-5">
                <div className="grid gap-2.5">
                  <Label htmlFor="unitNumber" className="text-sm font-medium">{t('unitNumber')}</Label>
                  <Input
                    id="unitNumber"
                    placeholder="Apartment/Unit number (if applicable)"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                  />
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="streetAddress" className="text-sm font-medium">{t('streetAddress')} *</Label>
                  <Input
                    id="streetAddress"
                    placeholder="Enter your street address"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.streetAddress && <p className="text-destructive text-xs">{errors.streetAddress}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="city" className="text-sm font-medium">{t('city')} *</Label>
                  <Input
                    id="city"
                    placeholder="Enter your city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.city && <p className="text-destructive text-xs">{errors.city}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2.5">
                    <Label htmlFor="postalCode" className="text-sm font-medium">{t('postalCode')} *</Label>
                    <Input
                      id="postalCode"
                      placeholder="Enter your postal code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="h-11 text-base placeholder:text-sm"
                      required
                    />
                    {errors.postalCode && <p className="text-destructive text-xs">{errors.postalCode}</p>}
                  </div>

                  <div className="grid gap-2.5">
                    <Label htmlFor="province" className="text-sm font-medium">{t('province')} *</Label>
                    <Input
                      id="province"
                      placeholder="Enter your province or state"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="h-11 text-base placeholder:text-sm"
                      required
                    />
                    {errors.province && <p className="text-destructive text-xs">{errors.province}</p>}
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="country" className="text-sm font-medium">{t('country')} *</Label>
                  <Input
                    id="country"
                    placeholder="Enter your country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.country && <p className="text-destructive text-xs">{errors.country}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="buzzCode" className="text-sm font-medium">{t('buzzCode')}</Label>
                  <Input
                    id="buzzCode"
                    placeholder="Enter your building entry code if needed"
                    value={buzzCode}
                    onChange={(e) => setBuzzCode(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : t('completeRegistration')}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 
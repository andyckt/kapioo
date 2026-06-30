"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { useLanguage } from "@/lib/language-context"
import { resolveServiceability } from "@/lib/zones/service-areas"

export default function AddressPage() {
  const [unitNumber, setUnitNumber] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [province, setProvince] = useState("")
  const [country] = useState("Canada") // Always Canada, not shown in UI
  const [buzzCode, setBuzzCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [selectedAddress, setSelectedAddress] = useState<ParsedGoogleAddress | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()

  useEffect(() => {
    // Check if user is logged in
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

  const validateForm = () => {
    // Check required fields
    const addressToSave = selectedAddress
    if (!streetAddress || !postalCode || !province || !addressToSave?.addressGeo) {
      toast({
        title: "Missing information",
        description: "Please select an address from the suggestions and fill in all required fields",
        variant: "destructive",
      })
      return false
    }
    
    return true
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const addressToSave = selectedAddress
    if (!validateForm() || !user || !addressToSave?.addressGeo) {
      return
    }
    
    setIsLoading(true)

    try {
      const response = await fetch(`/api/users/${user._id || user.userID}/verify-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            unitNumber,
            streetAddress,
            postalCode,
            province,
            country, // Always "Canada"
            buzzCode,
          },
          addressGeo: addressToSave.addressGeo,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Merge the updated response so other cached fields survive address edits.
        mergeStoredUser(result.data);
        
        // Show success toast
        toast({
          title: "Address saved",
          description: "Your delivery address has been saved successfully",
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
      console.error('Error saving address:', error);
      toast({
        title: "Failed to save address",
        description: "An error occurred. Please try again.",
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
                <Label htmlFor="unitNumber" className="text-sm font-medium">Unit Number</Label>
                <Input
                  id="unitNumber"
                  placeholder="Apartment, suite, unit, etc."
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                />
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="streetAddress" className="text-sm font-medium">Street Address <span className="text-red-500">*</span></Label>
                <AddressAutocomplete
                  value={streetAddress}
                  language={language}
                  placeholder="Street address"
                  disabled={isLoading}
                  onInputChange={(value) => {
                    setStreetAddress(value)
                    setSelectedAddress(null)
                  }}
                  onAddressSelect={(result) => {
                    const serviceability = resolveServiceability({
                      areaLabel: result.address.province,
                      postalCode: result.addressGeo.postalCode || result.address.postalCode,
                    })
                    if (!serviceability.isServed) {
                      toast({
                        title: "Address outside service area",
                        description:
                          "This address is not within Kapioo's delivery area. Please select an address in a supported area.",
                        variant: "destructive",
                      })
                      setStreetAddress("")
                      setSelectedAddress(null)
                      return
                    }
                    setSelectedAddress(result)
                    setStreetAddress(result.address.streetAddress || "")
                    setPostalCode(result.address.postalCode || "")
                    setProvince(result.address.province || "")
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2.5">
                  <Label htmlFor="province" className="text-sm font-medium">Area <span className="text-red-500">*</span></Label>
                  <Input
                    id="province"
                    placeholder="Province or state"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                </div>
                
                <div className="grid gap-2.5">
                  <Label htmlFor="postalCode" className="text-sm font-medium">ZIP Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="postalCode"
                    placeholder="ZIP code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="buzzCode" className="text-sm font-medium">Buzz/Entry Code</Label>
                <Input
                  id="buzzCode"
                  placeholder="Buzz code for building access (if needed)"
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
                  {isLoading ? "Saving..." : "Save Address"}
                </Button>
              </div>
            </div>
          </form>
          
          <p className="text-xs text-center text-muted-foreground">
            You can update your delivery address at any time from your account settings.
          </p>
        </div>
      </div>
    </div>
  )
} 
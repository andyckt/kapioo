"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

export default function AddressPage() {
  const [unitNumber, setUnitNumber] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [province, setProvince] = useState("")
  const [country, setCountry] = useState("")
  const [buzzCode, setBuzzCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const validateForm = () => {
    // Check required fields
    if (!streetAddress || !city || !postalCode || !province || !country) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return false
    }
    
    return true
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) {
      return
    }
    
    setIsLoading(true)

    try {
      // Call API to update user address
      const response = await fetch(`/api/users/${user._id || user.userID}`, {
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
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(result.data));
        
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
      <header className="w-full py-4 px-4">
        <div className="container">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
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
          </div>
          
          <div className="flex justify-end mb-2">
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="inline-flex items-center gap-1 text-[#C2884E] hover:text-[#D1A46C] hover:bg-transparent"
            >
              进入 Kapioo
              <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
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
                <Input
                  id="streetAddress"
                  placeholder="Street address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                  required
                />
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="city" className="text-sm font-medium">City <span className="text-red-500">*</span></Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2.5">
                  <Label htmlFor="province" className="text-sm font-medium">Province/State <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="postalCode" className="text-sm font-medium">Postal Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="postalCode"
                    placeholder="Postal code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2.5">
                <Label htmlFor="country" className="text-sm font-medium">Country <span className="text-red-500">*</span></Label>
                <Input
                  id="country"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 text-base placeholder:text-sm"
                  required
                />
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
        </motion.div>
      </div>
    </div>
  )
} 
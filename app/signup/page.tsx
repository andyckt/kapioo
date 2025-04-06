"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  const validateForm = () => {
    let isValid = true
    const newErrors = {
      name: "",
      phone: "",
      password: "",
      confirmPassword: "",
    }

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Name is required"
      isValid = false
    }

    // Validate phone
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required"
      isValid = false
    } else if (!/^\+?[0-9\s\-()]{8,}$/.test(phone.trim())) {
      newErrors.phone = "Please enter a valid phone number"
      isValid = false
    }

    // Validate password
    if (!password) {
      newErrors.password = "Password is required"
      isValid = false
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
      isValid = false
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)

    try {
      // Generate a userID automatically in the format "userXXX" where XXX is random
      // The actual userID generation will happen on the server
      
      // Call the user creation API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
          password,
          email: `${phone.replace(/[^0-9]/g, '')}@placeholder.com`, // Generate placeholder email
          credits: 0, // Start with 0 credits
          status: 'Active'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(result.data));
        
        // Show success toast
        toast({
          title: "Account created successfully",
          description: "Please complete your delivery address details",
        });
        
        // Redirect to address page
        router.push('/address');
      } else {
        // Show error toast
        toast({
          title: "Registration failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: "An error occurred during registration",
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
            href="/" 
            className="hidden sm:inline-flex items-center text-xs font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      
      <div className="container flex flex-1 items-center justify-center py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[420px]"
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
            <h1 className="text-2xl font-bold">{t('createAccount')}</h1>
            <p className="text-muted-foreground">{t('enterDetails')}</p>
          </div>
          
          <div className="grid gap-7">
            <form onSubmit={handleSignup} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
              <div className="grid gap-5">
                <div className="grid gap-2.5">
                  <Label htmlFor="name" className="text-sm font-medium">{t('fullName')}</Label>
                  <Input
                    id="name"
                    placeholder={t('fullName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="phone" className="text-sm font-medium">{t('phoneNumber')}</Label>
                  <Input
                    id="phone"
                    placeholder={t('enterPhoneNumber')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 text-base placeholder:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t('passwordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 pr-10 text-base placeholder:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : t('continueBtn')}
                </Button>
              </div>
            </form>
            
            <div className="text-center space-y-3">
              <div className="text-base">
                <span className="text-muted-foreground">{t('alreadyHaveAccount')} </span>
                <Link href="/login" className="font-medium hover:underline text-primary">
                  {t('signIn')}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 
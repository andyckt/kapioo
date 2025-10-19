"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// No longer needed here as area selection has been moved to verification page

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fromPage, setFromPage] = useState<string | null>(null)
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  
  // State to store the plan identifier
  const [planIdentifier, setPlanIdentifier] = useState<string | null>(null)

  // Check for URL parameters on component mount
  useEffect(() => {
    // Get parameters from the URL
    const params = new URLSearchParams(window.location.search)
    const fromParam = params.get('from')
    const planParam = params.get('plan')
    
    setFromPage(fromParam)
    setPlanIdentifier(planParam)
  }, [])

  const validateForm = () => {
    let isValid = true
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    }

    // Validate name
    if (!name.trim()) {
      newErrors.name = t('nameRequired');
      isValid = false
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = t('emailRequired');
      isValid = false
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())) {
      newErrors.email = t('validEmailRequired');
      isValid = false
    }

    // Validate password
    if (!password) {
      newErrors.password = t('passwordRequired');
      isValid = false
    } else if (password.length < 6) {
      newErrors.password = t('passwordLength');
      isValid = false
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('passwordsDoNotMatch');
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
      // Instead of creating a user in the database, we'll generate a verification code
      // and store the user data temporarily in localStorage
      
      // Generate a random verification code (6 digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Call the API to send verification email
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          code: verificationCode
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store user data and verification code in localStorage
        localStorage.setItem('pendingUser', JSON.stringify({
          email: email,
          name: name,
          password: password, // This will be used to create the account after verification
          verificationCode: verificationCode,
          credits: 0,
          status: 'Active',
          fromPage,
          planIdentifier
        }));
        
        // Build the redirect URL with parameters
        let redirectUrl = '/verify-email-sent';
        const params = [];
        
        if (fromPage) {
          params.push(`from=${fromPage}`);
        }
        
        if (planIdentifier) {
          params.push(`plan=${planIdentifier}`);
        }
        
        if (params.length > 0) {
          redirectUrl += '?' + params.join('&');
        }
        
        router.push(redirectUrl);
      } else {
        // Show error toast only for failures
        toast({
          title: t('registrationFailed'),
          description: result.error || t('somethingWentWrong'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: t('registrationFailed'),
        description: t('registrationError'),
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
            {t('backToHome')}
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
          </div>
          
          <div className="grid gap-7">
            <form onSubmit={handleSignup} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
              <div className="grid gap-5">
                <div className="grid gap-2.5">
                  <Label htmlFor="name" className="text-sm font-medium">{t('fullName')}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                  {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder=""
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
                      placeholder=""
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
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('creatingAccount')}
                    </div>
                  ) : t('createAccount')}
                </Button>
              </div>
            </form>
            
            <div className="text-center space-y-3">
              <p className="text-base">
                <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('alreadyHaveAccount')} <span className="font-medium text-primary hover:underline">{t('loginHere')}</span>
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 
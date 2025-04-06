"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState({
    email: "",
  })
  
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  const validateEmail = () => {
    let isValid = true
    const newErrors = {
      email: "",
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = "Email address is required"
      isValid = false
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())) {
      newErrors.email = "Please enter a valid email address"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail()) {
      return
    }
    
    setIsLoading(true)

    try {
      // Call API to send password reset email
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSubmitted(true)
        
        toast({
          title: "Reset link sent",
          description: "Check your email for the password reset link",
        });
      } else {
        toast({
          title: "Request failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      toast({
        title: "Request failed",
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
            href="/login" 
            className="inline-flex items-center text-sm font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Login
          </Link>
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
            <h1 className="text-2xl font-bold">{t('resetPassword')}</h1>
            <p className="text-muted-foreground">
              {isSubmitted 
                ? "Check your email for the reset link"
                : "Enter your email address to receive a password reset link"}
            </p>
          </div>
          
          <div className="grid gap-7">
            {isSubmitted ? (
              <div className="p-7 sm:p-8 bg-white shadow-lg rounded-xl text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Reset Email Sent</h2>
                <p className="text-muted-foreground mb-6">
                  We've sent a password reset link to <span className="font-medium text-black">{email}</span>. 
                  Check your inbox and follow the instructions to reset your password.
                </p>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleRequestReset} 
                    variant="outline" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      "Resend reset link"
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push('/login')}
                    className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
                <div className="grid gap-5">
                  <div className="grid gap-2.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 text-base placeholder:text-sm"
                      required
                    />
                    {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password? <Link href="/login" className="font-medium hover:underline text-primary">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 
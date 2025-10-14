"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

export default function ResetPasswordCodePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [step, setStep] = useState<'code' | 'password'>('code')
  const [resetSuccess, setResetSuccess] = useState(false)
  
  const [errors, setErrors] = useState({
    code: "",
    password: "",
    confirmPassword: "",
  })
  
  // Get email from localStorage on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('resetPasswordEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    } else {
      // If no email is stored, redirect to forgot password page
      router.push('/forgot-password')
    }
  }, [router])
  
  const validateCode = () => {
    let isValid = true
    const newErrors = { ...errors }
    
    if (!code.trim()) {
      newErrors.code = "Verification code is required"
      isValid = false
    } else if (code.trim().length !== 6 || !/^\d+$/.test(code.trim())) {
      newErrors.code = "Please enter a valid 6-digit code"
      isValid = false
    }
    
    setErrors(newErrors)
    return isValid
  }
  
  const validatePassword = () => {
    let isValid = true
    const newErrors = { ...errors }
    
    if (!password) {
      newErrors.password = "Password is required"
      isValid = false
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
      isValid = false
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      isValid = false
    }
    
    setErrors(newErrors)
    return isValid
  }
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCode()) {
      return
    }
    
    setIsVerifying(true)
    
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          code: code.trim() 
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStep('password')
        toast({
          title: "Code verified",
          description: "Please set your new password",
        })
      } else {
        toast({
          title: "Verification failed",
          description: result.error || "Invalid or expired code",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      toast({
        title: "Verification failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePassword()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password: password
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setResetSuccess(true)
        // Clear stored email
        localStorage.removeItem('resetPasswordEmail')
        
        toast({
          title: "Password reset successful",
          description: "Your password has been reset successfully",
        })
      } else {
        toast({
          title: "Reset failed",
          description: result.error || "Failed to reset password",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast({
        title: "Reset failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please go back to the forgot password page",
        variant: "destructive",
      })
      return
    }
    
    setIsResending(true)
    
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Code resent",
          description: "A new verification code has been sent to your email",
        })
      } else {
        toast({
          title: "Failed to resend code",
          description: result.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resending code:', error)
      toast({
        title: "Failed to resend code",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }
  
  const renderCodeForm = () => {
    return (
      <form onSubmit={handleVerifyCode} className="grid gap-5">
        <div className="grid gap-2.5">
          <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="h-11 text-base bg-gray-50"
          />
        </div>
        
        <div className="grid gap-2.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="code" className="text-sm font-medium">Verification Code</Label>
            <button
              type="button"
              onClick={handleResendCode}
              className="text-xs text-primary hover:underline"
              disabled={isResending}
            >
              {isResending ? "Resending..." : "Resend code"}
            </button>
          </div>
          <Input
            id="code"
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 text-base placeholder:text-sm"
            maxLength={6}
            required
          />
          {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to your email
          </p>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-11 mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
          disabled={isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : "Verify Code"}
        </Button>
      </form>
    )
  }
  
  const renderPasswordForm = () => {
    return (
      <form onSubmit={handleResetPassword} className="grid gap-5">
        <div className="grid gap-2.5">
          <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
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
          <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••"
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
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : "Reset Password"}
        </Button>
      </form>
    )
  }
  
  const renderSuccessMessage = () => {
    return (
      <>
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-center">Password Reset Successful</h2>
        <p className="text-muted-foreground mb-6 text-center">
          Your password has been successfully reset. You can now log in with your new password.
        </p>
        <Button 
          onClick={() => router.push('/login')}
          className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
        >
          Go to Login
        </Button>
      </>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-[#fff6ef]/50">
      <header className="w-full py-4 px-4">
        <div className="container">
          <Link 
            href="/forgot-password" 
            className="inline-flex items-center text-sm font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Forgot Password
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
              {step === 'code' 
                ? "Enter the verification code sent to your email" 
                : resetSuccess 
                  ? "Your password has been reset successfully"
                  : "Create a new password for your account"}
            </p>
          </div>
          
          <div className="grid gap-7">
            <div className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
              {resetSuccess 
                ? renderSuccessMessage()
                : step === 'code' 
                  ? renderCodeForm() 
                  : renderPasswordForm()}
            </div>
            
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

"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const { toast } = useToast()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [errorMessage, setErrorMessage] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  })
  
  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setErrorMessage("No reset token found");
      return;
    }
    
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          setTokenStatus('valid');
        } else {
          setTokenStatus('invalid');
          setErrorMessage(data.error || "Invalid or expired reset token");
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setTokenStatus('invalid');
        setErrorMessage("Failed to verify reset token");
      }
    };
    
    verifyToken();
  }, [token]);
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      password: "",
      confirmPassword: "",
    };
    
    // Validate password
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResetSuccess(true);
        
        toast({
          title: "Password reset successful",
          description: "Your password has been reset",
        });
      } else {
        toast({
          title: "Reset failed",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Reset failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    if (tokenStatus === 'checking') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-10 w-10 text-[#C2884E] animate-spin mb-4" />
          <p className="text-muted-foreground">Verifying reset token...</p>
        </div>
      );
    }
    
    if (tokenStatus === 'invalid') {
      return (
        <>
          <CardHeader className="pb-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <p className="text-muted-foreground mb-4">
              {errorMessage || "Your password reset link is invalid or has expired."}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              onClick={() => router.push('/forgot-password')} 
              className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
            >
              Request a new reset link
            </Button>
            <Button 
              onClick={() => router.push('/login')} 
              variant="outline" 
              className="w-full"
            >
              Return to Login
            </Button>
          </CardFooter>
        </>
      );
    }
    
    if (resetSuccess) {
      return (
        <>
          <CardHeader className="pb-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl text-center">Password Reset Complete</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <p className="text-muted-foreground mb-4">
              Your password has been successfully reset. You can now log in to your account with your new password.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
            >
              Go to Login
            </Button>
          </CardFooter>
        </>
      );
    }
    
    return (
      <form onSubmit={handleResetPassword}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-center">Create a New Password</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
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
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
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
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform" 
            disabled={isLoading}
          >
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </CardFooter>
      </form>
    );
  };

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
          className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[450px]"
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
            <h1 className="text-2xl font-bold">Reset Your Password</h1>
          </div>
          
          <Card className="w-full bg-white shadow-lg">
            {renderContent()}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-10 w-10 text-[#C2884E] animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
} 
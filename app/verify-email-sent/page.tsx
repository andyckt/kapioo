"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Check, ArrowLeft, RefreshCw, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function VerifyEmailSentPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState<string>("")
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const { toast } = useToast()
  
  useEffect(() => {
    // Get pending user email from localStorage
    const pendingUser = localStorage.getItem('pendingUser')
    if (pendingUser) {
      try {
        const userData = JSON.parse(pendingUser)
        setUserEmail(userData.email || "")
      } catch (error) {
        console.error('Error parsing pendingUser data:', error)
      }
    }
  }, [])

  const handleResendVerification = async () => {
    if (!userEmail) return
    
    setIsResending(true)
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "验证码已发送",
          description: "请查看您的邮箱获取验证码",
        })
      } else {
        toast({
          title: "重新发送失败",
          description: data.error || "发生错误，请重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      toast({
        title: "重新发送失败",
        description: "发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userEmail || !verificationCode) {
      toast({
        title: "验证失败",
        description: "请输入验证码",
        variant: "destructive",
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail,
          code: verificationCode
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVerificationStatus("success")
        
        // If there's user data in the response, store it
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
          
          // Store authentication state
          localStorage.setItem('isAuthenticated', 'true')
        }
        
        // Clear any pending user data
        localStorage.removeItem('pendingUser')
        
        toast({
          title: "验证成功",
          description: "您的邮箱已成功验证",
        })
      } else {
        setVerificationStatus("error")
        setErrorMessage(data.error || "验证码无效或已过期")
        toast({
          title: "验证失败",
          description: data.error || "验证码无效或已过期",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error verifying email:', error)
      setVerificationStatus("error")
      setErrorMessage("验证过程中发生错误")
      toast({
        title: "验证失败",
        description: "验证过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const renderContent = () => {
    switch (verificationStatus) {
      case "success":
        return (
          <>
            <CardHeader className="pb-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl text-center">邮箱验证成功！</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-4">
                您的邮箱已成功验证。您现在可以进入您的账户或设置您的配送地址。
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={() => router.push('/address')} 
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
              >
                继续设置地址
              </Button>
              <Button 
                onClick={() => router.push('/dashboard')} 
                variant="outline" 
                className="w-full"
              >
                进入 Kapioo
              </Button>
            </CardFooter>
          </>
        )
      
      case "error":
        return (
          <>
            <CardHeader className="pb-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-center">验证失败</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-4">
                {errorMessage || "验证码无效或已过期"}
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">验证码</Label>
                  <Input
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="请输入6位数验证码"
                    className="h-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在验证...
                    </>
                  ) : (
                    "重新验证"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={handleResendVerification} 
                variant="outline" 
                className="w-full" 
                disabled={isResending || !userEmail}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    正在重新发送...
                  </>
                ) : (
                  "重新发送验证码"
                )}
              </Button>
            </CardFooter>
          </>
        )
      
      default:
        return (
          <>
            <CardHeader className="pb-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-[#C2884E]" />
              </div>
              <CardTitle className="text-xl text-center">查看您的邮箱</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-4">
                我们已向 <span className="font-medium text-black">{userEmail || "您的邮箱"}</span> 发送了一个6位数的验证码
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">验证码</Label>
                  <Input
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="请输入6位数验证码"
                    className="h-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      正在验证...
                    </>
                  ) : (
                    "验证邮箱"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={handleResendVerification} 
                variant="outline" 
                className="w-full" 
                disabled={isResending || !userEmail}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    正在重新发送...
                  </>
                ) : (
                  "重新发送验证码"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground pt-2">
                <Link href="/dashboard" className="text-gray-500 font-medium hover:underline">{/* 直接前往 Kapioo */}</Link>
              </p>
            </CardFooter>
          </>
        )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff6ef]/50">
      <div className="container flex flex-1 items-center justify-center py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[500px]"
        >
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Image 
              src="/未命名設計.png" 
              alt="Kapioo Logo" 
              width={48} 
              height={48} 
              className="h-12 w-12 transition-transform duration-300 group-hover:rotate-6" 
            />
            <span className="inline-block font-bold text-[#C2884E] text-2xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
          </Link>
          
          <Card className="w-full bg-white shadow-lg">
            {renderContent()}
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 
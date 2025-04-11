"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Check, X, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function VerifyEmailPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [verificationState, setVerificationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")
  
  useEffect(() => {
    // Get pending user email from localStorage
    const pendingUser = localStorage.getItem('pendingUser')
    if (pendingUser) {
      try {
        const userData = JSON.parse(pendingUser)
        setEmail(userData.email || "")
      } catch (error) {
        console.error('Error parsing pendingUser data:', error)
      }
    }
  }, [])
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !code) {
      setErrorMessage("请输入邮箱地址和验证码")
      setVerificationState('error')
      return
    }
    
    setVerificationState('loading')
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          code 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVerificationState('success')
        
        // If there's user data in the response, store it
        if (data.user) {
          // Make sure user data includes the _id field before storing
          if (data.user._id) {
            localStorage.setItem('user', JSON.stringify(data.user))
            
            // Store authentication state
            localStorage.setItem('isAuthenticated', 'true')
          } else {
            console.error('Verification response missing user _id:', data.user);
            setErrorMessage("User data is incomplete. Please try logging in instead.");
            setVerificationState('error');
            return;
          }
        }
        
        // Clear any pending user data
        localStorage.removeItem('pendingUser')
      } else {
        setVerificationState('error')
        setErrorMessage(data.error || "验证码无效或已过期")
      }
    } catch (error) {
      console.error('Error verifying email:', error)
      setVerificationState('error')
      setErrorMessage("验证过程中发生错误")
    }
  }
  
  const renderContent = () => {
    switch (verificationState) {
      case 'idle':
        return (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-center">验证您的邮箱</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-6">
                请输入您收到的6位数验证码以完成邮箱验证
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入您的邮箱地址"
                    className="h-10"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">验证码</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="请输入6位数验证码"
                    className="h-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                >
                  验证邮箱
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <p className="text-xs text-center text-muted-foreground pt-2">
                没有收到验证码？ <Link href="/verify-email-sent" className="text-primary font-medium hover:underline">重新发送</Link>
              </p>
            </CardFooter>
          </>
        )
        
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="animate-spin h-10 w-10 text-[#C2884E] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">正在验证...</p>
          </div>
        )
        
      case 'success':
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
        
      case 'error':
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
                {errorMessage || "我们无法验证您的邮箱。验证码可能无效或已过期。"}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={() => setVerificationState('idle')} 
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
              >
                重试
              </Button>
              <Button 
                onClick={() => router.push('/signup')} 
                variant="outline" 
                className="w-full"
              >
                返回注册
              </Button>
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
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
import { useLanguage } from "@/lib/language-context"
import { buildAuthSnapshotFromRegister } from "@/lib/client/signup-after-register"
import { useClientAuth } from "@/lib/client-auth"

export default function VerifyEmailSentPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const { applyAuthSnapshot } = useClientAuth()
  const [userEmail, setUserEmail] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState<string>("")
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [fromPage, setFromPage] = useState<string | null>(null)
  const { toast } = useToast()
  
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
  
  useEffect(() => {
    // Get pending user email from localStorage
    const pendingUser = localStorage.getItem('pendingUser')
    if (pendingUser) {
      try {
        const userData = JSON.parse(pendingUser)
        setUserEmail(userData.email || "")
        setUserId(userData.userId || "")
      } catch (error) {
        console.error('Error parsing pendingUser data:', error)
      }
    }
  }, [])

  const handleResendVerification = async () => {
    if (!userEmail) return
    
    setIsResending(true)
    
    try {
      // Get the pending user data from localStorage
      const pendingUserStr = localStorage.getItem('pendingUser')
      if (!pendingUserStr) {
        toast({
          title: t('resendFailed'),
          description: t('cannotFindRegistration'),
          variant: "destructive",
        })
        setIsResending(false)
        return
      }
      
      const pendingUser = JSON.parse(pendingUserStr)
      
      // Generate a new verification code
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Update the verification code in localStorage
      pendingUser.verificationCode = newVerificationCode
      localStorage.setItem('pendingUser', JSON.stringify(pendingUser))
      
      // Send the new verification code
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pendingUser.name,
          email: pendingUser.email,
          code: newVerificationCode
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: t('verificationCodeSent'),
          description: t('resendSuccess'),
        })
      } else {
        toast({
          title: t('resendFailed'),
          description: data.error || t('errorOccurred'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      toast({
        title: t('resendFailed'),
        description: t('errorOccurred'),
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
        title: t('verificationFailed'),
        description: t('verificationCodePlaceholder'),
        variant: "destructive",
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      // Get the pending user data from localStorage
      const pendingUserStr = localStorage.getItem('pendingUser')
      if (!pendingUserStr) {
        setErrorMessage(t('cannotFindRegistration'))
        setVerificationStatus("error")
        toast({
          title: t('verificationFailed'),
          description: t('cannotFindRegistration'),
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }
      
      const pendingUser = JSON.parse(pendingUserStr)
      
      // Verify that the entered code matches the stored code
      if (pendingUser.email !== userEmail || pendingUser.verificationCode !== verificationCode) {
        setVerificationStatus("error")
        setErrorMessage(t('invalidCode'))
        toast({
          title: t('verificationFailed'),
          description: t('invalidCode'),
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }
      
      // Create account + session in one request (no duplicate password hash or extra auth/me)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pendingUser.name,
          email: pendingUser.email,
          password: pendingUser.password,
          credits: pendingUser.credits || 0,
          status: pendingUser.status || 'Active',
          languagePreference: pendingUser.languagePreference || 'zh',
        }),
      })
      
      const data = await response.json()

      if (response.status === 504 || response.status === 408) {
        setVerificationStatus("error")
        setErrorMessage(
          language === 'en'
            ? 'The server took too long. Please wait a moment and try again.'
            : '服务器响应超时，请稍等片刻后重试。'
        )
        toast({
          title: t('verificationFailed'),
          description:
            language === 'en'
              ? 'Request timed out. Please try again.'
              : '请求超时，请重试。',
          variant: "destructive",
        })
        return
      }
      
      if (data.success && data.data) {
        const authSnapshot = buildAuthSnapshotFromRegister(data.data)

        if (!authSnapshot) {
          setVerificationStatus("error")
          setErrorMessage(t('loginError'))
          toast({
            title: t('verificationFailed'),
            description: t('loginError'),
            variant: "destructive",
          })
          return
        }

        applyAuthSnapshot(authSnapshot)
        localStorage.removeItem('pendingUser')

        toast({
          title: language === 'en' ? "Email verified" : "邮箱验证成功",
          description: language === 'en' ? "Please set up your delivery address." : "请设置您的配送地址。",
        })

        // Redirect to address verify page; params flow through so the gate
        // can redirect to the right plan page after verification completes.
        const verifyParams = new URLSearchParams()
        if (fromPage) verifyParams.set('from', fromPage)
        if (planIdentifier) verifyParams.set('plan', planIdentifier)
        const paramStr = verifyParams.toString()
        router.replace(`/address/verify${paramStr ? `?${paramStr}` : ''}`)
        return

        setVerificationStatus("success")
      } else {
        setVerificationStatus("error")
        setErrorMessage(data.error || "账户创建失败")
        toast({
          title: "验证失败",
          description: data.error || "账户创建失败",
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
  
  // (area-saving removed — users are redirected to /address/verify after registration)
  const _unused = () => {
    if (false) {
      router.push('/dashboard')
        }
    }
  }

  const renderContent = () => {
    switch (verificationStatus) {
      case "success":
        // User is being redirected to /address/verify — show brief loading state
        return (
          <>
            <CardHeader className="pb-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base text-center mt-1">
                {language === 'en' ? "Verified!" : "验证成功！"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {language === 'en' ? "Setting up your address…" : "正在跳转至地址设置…"}
              </div>
            </CardContent>
          </>
        )
      
      case "error":
        return (
          <>
            <CardHeader className="pb-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-center">{t('verificationFailed')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-4">
                {errorMessage || t('invalidCode')}
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">{t('enterVerificationCode')}</Label>
                  <Input
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={t('verificationCodePlaceholder')}
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
                      {t('verifying')}
                    </>
                  ) : (
                    t('verifyEmail')
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
                    {t('resending')}
                  </>
                ) : (
                  t('resendCode')
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
              <CardTitle className="text-xl text-center">{t('checkYourEmail')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-muted-foreground mb-4">
                {t('verificationCodeSentTo')} <span className="font-medium text-black">{userEmail || (language === 'zh' ? '您的邮箱' : 'your email')}</span> {t('pleaseCheckEmail')}
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">{t('enterVerificationCode')}</Label>
                  <Input
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={t('verificationCodePlaceholder')}
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
                      {t('verifying')}
                    </>
                  ) : (
                    t('verifyEmail')
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
                    {t('resending')}
                  </>
                ) : (
                  t('resendCode')
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
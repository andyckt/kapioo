"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Check, ArrowLeft, RefreshCw, Loader2, X, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// Define available service areas
const serviceAreas = [
  'Downtown', 
  'Midtown', 
  'NorthYork', 
  'Markham', 
  'Richmond Hill',
  'Vaughan', 
  'Mississauga', 
  'Oakville', 
  'Aurora', 
  'Newmarket'
]

export default function VerifyEmailSentPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState<string>("")
  const [area, setArea] = useState<string>("")
  const [areaError, setAreaError] = useState<string>("")
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSavingArea, setIsSavingArea] = useState(false)
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
          title: "重新发送失败",
          description: "无法找到注册信息，请重新注册",
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
      // Get the pending user data from localStorage
      const pendingUserStr = localStorage.getItem('pendingUser')
      if (!pendingUserStr) {
        setErrorMessage("无法找到注册信息，请重新注册")
        setVerificationStatus("error")
        toast({
          title: "验证失败",
          description: "无法找到注册信息，请重新注册",
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }
      
      const pendingUser = JSON.parse(pendingUserStr)
      
      // Verify that the entered code matches the stored code
      if (pendingUser.email !== userEmail || pendingUser.verificationCode !== verificationCode) {
        setVerificationStatus("error")
        setErrorMessage("验证码无效或邮箱地址不匹配")
        toast({
          title: "验证失败",
          description: "验证码无效或邮箱地址不匹配",
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }
      
      // Now create the user account since verification is successful
      const response = await fetch('/api/users', {
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
          isVerified: true // Mark as verified immediately
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVerificationStatus("success")
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.data))
        
        // Store authentication state
        localStorage.setItem('isAuthenticated', 'true')
        
        // Check if there was a meal plan selection before signup
        const selectedMealPlan = localStorage.getItem('selectedMealPlan')
        if (selectedMealPlan) {
          // We'll handle the redirection to meal purchase in the success UI
          // This allows us to show the success message first
        }
        
        // Clear any pending user data
        localStorage.removeItem('pendingUser')
        
        toast({
          title: "验证成功",
          description: "请选择您的区域",
        })
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
  
  // Function to handle saving the area
  const handleSaveArea = async () => {
    // Clear any previous error
    setAreaError("")
    
    // Validate area is selected
    if (!area) {
      setAreaError("Please select your area")
      toast({
        title: "区域未选择",
        description: "请选择您的区域",
        variant: "destructive",
      })
      return
    }
    
    // Get the user ID from localStorage
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      toast({
        title: "保存失败",
        description: "用户信息不存在",
        variant: "destructive",
      })
      return
    }
    
    const userData = JSON.parse(storedUser)
    const userId = userData._id
    
    if (!userId) {
      toast({
        title: "保存失败",
        description: "用户ID不存在",
        variant: "destructive",
      })
      return
    }
    
    setIsSavingArea(true)
    
    try {
      // Call API to update user address
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            province: area
          }
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update user data in localStorage
        userData.address = userData.address || {}
        userData.address.province = area
        localStorage.setItem('user', JSON.stringify(userData))
        
        // Determine which tab to redirect to based on the source page
        const targetTab = fromPage === 'daily-delivery' ? 'meal-vouchers' : 'credits'
        
        // Check if there was a meal plan selection before signup
        const hasMealPlan = fromPage === 'daily-delivery' || fromPage === 'weekly-meal'
        
        // Redirect to appropriate page
        if (hasMealPlan) {
          // Build URL with plan parameter if available
          const url = planIdentifier 
            ? `/dashboard?tab=${targetTab}&selectPlan=true&plan=${planIdentifier}`
            : `/dashboard?tab=${targetTab}&selectPlan=true`
          router.push(url)
        } else {
          router.push('/dashboard')
        }
      } else {
        toast({
          title: "保存失败",
          description: data.error || "发生错误，请重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving area:', error)
      toast({
        title: "保存失败",
        description: "发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSavingArea(false)
    }
  }

  const renderContent = () => {
    switch (verificationStatus) {
      case "success":
        // Check if there was a meal plan selection before signup
        const selectedMealPlan = localStorage.getItem('selectedMealPlan')
        const hasMealPlan = !!selectedMealPlan || fromPage === 'daily-delivery' || fromPage === 'weekly-meal'
        
        return (
          <>
            <CardHeader className="pb-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base text-center mt-1">Verified</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-sm font-medium">Your Area</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="area"
                        variant="outline"
                        role="combobox"
                        className="h-10 w-full justify-between text-left font-normal"
                      >
                        {area || "Select your area..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-full">
                      <Command>
                        <CommandInput placeholder="Search area..." />
                        <CommandList>
                          <CommandEmpty>No area found.</CommandEmpty>
                          <CommandGroup>
                            {serviceAreas.map((areaOption) => (
                              <CommandItem
                                key={areaOption}
                                value={areaOption}
                                onSelect={() => setArea(areaOption)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    area === areaOption ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {areaOption}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {areaError && <p className="text-destructive text-xs">{areaError}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={handleSaveArea}
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                disabled={isSavingArea}
              >
                {isSavingArea ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : hasMealPlan ? (
                  "继续购买餐券"
                ) : (
                  "进入我的账户"
                )}
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
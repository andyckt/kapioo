"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, 
  Upload, 
  Check, 
  CheckCircle,
  Clock, 
  AlertCircle, 
  Info, 
  MapPin,
  ArrowRight,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Tag,
  Calendar,
  Utensils,
  MessageSquare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RegionCheckDialogRecharge } from '@/components/region-check-dialog-recharge'

// Define types for voucher plans
interface VoucherPlan {
  id: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  price: number;
  isPopular?: boolean;
  pricePerMeal: number;
  savings?: string;
}

interface MealVoucherPurchaseProps {
  onSuccess?: () => void;
}

export default function MealVoucherPurchase({ onSuccess }: MealVoucherPurchaseProps = {}) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'twoDish' | 'threeDish'>('twoDish')
  const [selectedPlan, setSelectedPlan] = useState<VoucherPlan | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'upload'>('select')
  const router = useRouter()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [showRegionDialog, setShowRegionDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Define voucher plans
  const twoDishPlans: VoucherPlan[] = [
    { id: 'two-6', type: 'twoDish', quantity: 6, price: 131, pricePerMeal: 21.83 },
    { id: 'two-10', type: 'twoDish', quantity: 10, price: 195, pricePerMeal: 19.50, isPopular: true, savings: language === 'zh' ? '首次推荐' : 'First Time Recommend!' },
    { id: 'two-22', type: 'twoDish', quantity: 22, price: 356, pricePerMeal: 16.18 },
    { id: 'two-46', type: 'twoDish', quantity: 46, price: 712, pricePerMeal: 15.48 }
  ]

  const threeDishPlans: VoucherPlan[] = [
    { id: 'three-6', type: 'threeDish', quantity: 6, price: 150, pricePerMeal: 25.00 },
    { id: 'three-10', type: 'threeDish', quantity: 10, price: 228, pricePerMeal: 22.80, isPopular: true, savings: language === 'zh' ? '首次推荐' : 'First Time Recommend!' },
    { id: 'three-22', type: 'threeDish', quantity: 22, price: 417, pricePerMeal: 18.95 },
    { id: 'three-46', type: 'threeDish', quantity: 46, price: 818, pricePerMeal: 17.78 }
  ]

  // Available service areas
  const DAILY_DELIVERY_REGIONS = ['Downtown', 'Midtown', 'NorthYork', 'Markham', 'RichmondHill']

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0])
    }
  }

  // Load user data and check region on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      
      // Check user's region
      if (user.address && user.address.province) {
        setUserRegion(user.address.province)
      }
    }
  }, [])

  // Handle region change
  const handleRegionChange = async (region: string): Promise<void> => {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('User not logged in')
      }
      
      const user = JSON.parse(userData)
      
      // Update user's address with the new region
      const updatedAddress = {
        ...user.address,
        province: region
      }
      
      // Update user data in the database
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: updatedAddress
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update localStorage
        user.address = updatedAddress
        localStorage.setItem('user', JSON.stringify(user))
        
        // Update state
        setUserRegion(region)
        
        toast({
          title: language === 'zh' ? "区域已更新" : "Region Updated",
          description: language === 'zh' ? "您的区域已成功更新" : "Your region has been successfully updated"
        })
      } else {
        throw new Error(result.error || 'Failed to update region')
      }
    } catch (error) {
      console.error('Error updating region:', error)
      toast({
        title: language === 'zh' ? "更新失败" : "Update Failed",
        description: error instanceof Error ? error.message : 
          (language === 'zh' ? "更新区域时出现错误" : "An error occurred while updating your region"),
        variant: "destructive"
      })
      throw error
    }
  }

  // Handle plan selection
  const handlePlanSelect = (plan: VoucherPlan) => {
    console.log('MealVoucherPurchase - Plan selected:', plan)
    setSelectedPlan(plan)
    
    // Check if user's region is in the supported list
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      if (user.address && user.address.province) {
        const userProvince = user.address.province
        if (!DAILY_DELIVERY_REGIONS.includes(userProvince)) {
          setUserRegion(userProvince)
          setShowRegionDialog(true)
          return
        }
      }
    }
    
    // If region is supported or no region is set, proceed to upload step
    setPurchaseStep('upload')
    console.log('MealVoucherPurchase - Purchase step set to upload')
  }

  // Handle file upload to AWS S3
  const uploadFileToS3 = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload file')
    }
    
    const data = await response.json()
    return data.url
  }

  // Handle payment proof upload and submission
  const handleUpload = async () => {
    if (!paymentProof) {
      toast({
        title: language === 'zh' ? "请上传付款凭证" : "Please upload payment proof",
        variant: "destructive"
      })
      return
    }

    // Submit the purchase directly
    await handleSubmitPurchase()
  }

  // Handle purchase submission
  const handleSubmitPurchase = async () => {
    if (!selectedPlan || !paymentProof) {
      toast({
        title: language === 'zh' ? "信息不完整" : "Incomplete information",
        description: language === 'zh' ? "请选择套餐并上传付款凭证" : "Please select a plan and upload payment proof",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      // 1. Upload the file to S3
      const imageProofUrl = await uploadFileToS3(paymentProof)
      
      // 2. Get user data from localStorage
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('User not logged in')
      }
      
      const user = JSON.parse(userData)
      
      // 3. Submit the voucher purchase request
      const response = await fetch('/api/voucher-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user._id,
          type: selectedPlan.type,
          quantity: selectedPlan.quantity,
          amount: selectedPlan.price * 1.13, // Add 13% tax for EMT payment
          originalPrice: selectedPlan.price, // Store original price before tax
          taxRate: 0.13, // 13% tax rate
          imageProof: imageProofUrl,
          notes: notes || undefined
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit purchase request')
      }
      
      // 4. Handle success
      setIsSubmitted(true)
      
      toast({
        title: language === 'zh' ? "购买请求已提交" : "Purchase request submitted",
        description: language === 'zh' ? "我们将尽快审核您的请求" : "We will review your request as soon as possible"
      })
      
      // Call onSuccess callback if provided to refresh the purchase history
      if (onSuccess) {
        onSuccess()
      }
      
      // Refresh voucher balance (will update once approved)
      const fetchVoucherBalance = async () => {
        const userData = localStorage.getItem('user')
        if (!userData) return
        
        try {
          const user = JSON.parse(userData)
          const response = await fetch(`/api/users/${user._id}/vouchers`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setCurrentTwoDishVouchers(data.data.twoDishVoucher || 0)
              setCurrentThreeDishVouchers(data.data.threeDishVoucher || 0)
            }
          }
        } catch (error) {
          console.error('Error refreshing voucher balance:', error)
        }
      }
      
    } catch (error) {
      console.error('Error submitting purchase request:', error)
      toast({
        title: language === 'zh' ? "提交失败" : "Submission failed",
        description: error instanceof Error ? error.message : 
          (language === 'zh' ? "提交请求时出现错误" : "An error occurred while submitting your request"),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render the plan cards
  const renderPlanCards = (plans: VoucherPlan[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -8, boxShadow: "0 10px 25px -5px rgba(194, 136, 78, 0.1), 0 8px 10px -6px rgba(194, 136, 78, 0.1)" }}
            transition={{ duration: 0.3 }}
            className={`relative rounded-xl border overflow-hidden group ${
              selectedPlan?.id === plan.id 
                ? "border-[#C2884E] ring-2 ring-[#C2884E]/30" 
                : "border-[#C2884E]/10 hover:border-[#C2884E]/30"
            }`}
          >
            {/* Popular badge */}
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-[#F5EDE4] text-[#C2884E] px-3 py-1 text-xs font-medium rounded-bl-xl z-10">
                  {language === 'zh' ? '推荐' : 'Most Popular'}
              </div>
            )}
            
            {/* Savings badge */}
            {plan.savings && !plan.isPopular && (
              <div className="absolute top-0 right-0 bg-[#F5EDE4] text-[#C2884E] px-3 py-1 text-xs font-medium rounded-bl-xl z-10">
                {plan.savings}
              </div>
            )}
            
            {/* Card header */}
            <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white p-5 relative overflow-hidden">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <Utensils className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium opacity-90">
                    {plan.type === 'twoDish' 
                      ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                      : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm opacity-80">
                    / {plan.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Card content */}
            <div className="p-5 bg-gradient-to-b from-white to-[#F5EDE4]/20">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '餐券数量' : 'Vouchers'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">{plan.quantity}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#C2884E]" />
                    <span className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '单价' : 'Per meal'}
                    </span>
                  </div>
                  <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 pt-3 border-t border-[#C2884E]/10">
                {/* Show 首次推荐 as first tick if available */}
                {plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">{plan.savings}</span>
                  </div>
                )}
                
                {/* Show 可转让 as first tick for plans without savings */}
                {!plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">
                      {language === 'zh' ? '可转让' : 'Transferable'}
                    </span>
                  </div>
                )}
                
                {/* Show 可转让 as second tick for plans with savings */}
                {plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                    <span className="text-[#6B5F53]">
                      {language === 'zh' ? '可转让' : 'Transferable'}
                    </span>
                  </div>
                )}
                
                {/* Show Valid for 1 year as the last tick */}
                <div className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                  <span className="text-[#6B5F53]">
                    {language === 'zh' ? '有效期1年' : 'Valid for 1 year'}
                  </span>
                </div>
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
                onClick={() => handlePlanSelect(plan)}
              >
                {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // Render success message
  const renderSuccessMessage = () => {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-[#C2884E]/10">
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-medium text-[#6B5F53] mb-2">
              {language === 'zh' ? '您的购买请求已提交' : 'Your purchase request has been submitted'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'zh' ? '我们将在15分钟内审核您的请求' : 'We will approve your request within 15 minutes'}
            </p>
            <p className="text-muted-foreground mt-2">
              {language === 'zh' ? '审核结果将通过电子邮件通知您' : 'You will receive an email notification'}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {language === 'zh' ? '通知邮件可能会进入您的垃圾邮件文件夹，请注意查收。' : 'The notification email may be in your spam folder, please check.'}
            </p>
          </div>
          <Button 
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
            onClick={() => {
              setIsSubmitted(false);
              setSelectedPlan(null);
              setPaymentProof(null);
              setNotes('');
              setPurchaseStep('select');
            }}
          >
            {language === 'zh' ? '返回' : 'Return to Plans'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render the upload section
  const renderUploadSection = () => {
    if (isSubmitted) {
      return renderSuccessMessage();
    }
    
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-[#C2884E]/10">
        <CardHeader className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#C2884E] p-2 rounded-full text-white">
              <Upload className="h-4 w-4" />
            </div>
            <CardTitle>{language === 'zh' ? '上传付款凭证' : 'Upload Payment Proof'}</CardTitle>
          </div>
          <CardDescription>
            {language === 'zh' 
              ? '请通过Interac e-Transfer转账后上传付款凭证' 
              : 'Please upload proof of payment after sending Interac e-Transfer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Selected plan summary */}
          {selectedPlan && (
            <div className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] p-5 rounded-xl border border-[#C2884E]/10 shadow-sm">
              <h3 className="font-medium mb-3 text-[#6B5F53] flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#C2884E]" />
                {language === 'zh' ? '已选套餐' : 'Selected Plan'}
              </h3>
              <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] w-10 h-10 rounded-full flex items-center justify-center text-white">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[#6B5F53]">
                      {selectedPlan.type === 'twoDish' 
                        ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                        : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#C2884E]">${selectedPlan.price}</p>
                  <p className="text-xs text-muted-foreground">
                    ${selectedPlan.pricePerMeal.toFixed(2)} {language === 'zh' ? '每餐' : '/meal'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method and Tax Information - commented out
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 className="font-medium text-amber-800 mb-2">{language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}</h4>
            <div className="space-y-2 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                <p>{language === 'zh' ? '通过EMT电子转账支付需额外缴纳13%税费' : 'Additional 13% tax applies when paying via EMT'}</p>
              </div>
            </div>
          </div>
          */}
          
          {/* E-Transfer Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? 'Interac e-Transfer 信息' : 'Interac e-Transfer Information'}
            </h3>
            
            <div className="bg-white border border-[#C2884E]/10 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] px-4 py-2 text-white text-sm font-medium">
                {language === 'zh' ? '付款详情' : 'Payment Details'}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-dashed border-[#C2884E]/10 pb-2">
                  <p className="text-sm text-[#6B5F53]">{language === 'zh' ? '收款人邮箱' : 'Recipient Email'}</p>
                  <p className="font-medium text-[#6B5F53]">kapioomeal@gmail.com</p>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-[#C2884E]/10 pb-2">
                  <p className="text-sm text-[#6B5F53]">{language === 'zh' ? '小计' : 'Subtotal'}</p>
                  <p className="font-medium text-[#6B5F53]">${selectedPlan?.price}</p>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-[#C2884E]/10 pb-2">
                  <p className="text-sm text-[#6B5F53]">{language === 'zh' ? 'EMT付款税费 (13%)' : 'EMT Payment Tax (13%)'}</p>
                  <p className="font-medium text-[#6B5F53]">${selectedPlan ? (selectedPlan.price * 0.13).toFixed(2) : '0.00'}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-[#6B5F53]">{language === 'zh' ? '总金额' : 'Total Amount'}</p>
                  <p className="font-medium text-[#C2884E]">${selectedPlan ? (selectedPlan.price * 1.13).toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? '上传付款凭证' : 'Upload Payment Proof'}
            </h3>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 
                ${paymentProof 
                  ? 'bg-green-50 border-green-200 hover:bg-green-100/70' 
                  : 'border-[#C2884E]/20 hover:border-[#C2884E]/40 hover:bg-[#F5EDE4]/30'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {paymentProof ? (
                <motion.div 
                  className="space-y-3"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm border border-green-200">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">{paymentProof.name}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {language === 'zh' ? '文件已上传' : 'File uploaded'}
                    </p>
                    <p className="text-xs text-green-500 mt-2">
                      {language === 'zh' ? '点击更换文件' : 'Click to change file'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-[#F5EDE4] w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="h-6 w-6 text-[#C2884E]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#6B5F53]">
                      {language === 'zh' ? '点击上传付款凭证' : 'Click to upload payment proof'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'zh' ? '支持 PNG, JPG, PDF 格式' : 'PNG, JPG, PDF formats supported'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {language === 'zh' ? '最大文件大小: 5MB' : 'Maximum file size: 5MB'}
                    </p>
                  </div>
                </motion.div>
              )}
              <input 
                ref={fileInputRef}
                id="payment-proof" 
                type="file" 
                className="hidden" 
                accept="image/png,image/jpeg,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <Info className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? '备注 (可选)' : 'Notes (Optional)'}
            </h3>
            <Textarea 
              id="notes" 
              placeholder={language === 'zh' ? '添加任何相关信息，例如转账参考号...' : 'Add any relevant information, such as transfer reference...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2]/50 to-[#F5EDE4]/50">
          <Button 
            variant="outline" 
            onClick={() => setPurchaseStep('select')}
            className="border-[#C2884E]/20 text-[#6B5F53] hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'zh' ? '返回' : 'Back'}
          </Button>
            <Button 
              onClick={handleUpload}
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] hover:opacity-90"
              disabled={!paymentProof || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'zh' ? '提交中...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {language === 'zh' ? '提交' : 'Submit'}
                </>
              )}
            </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render the confirmation section
  const renderConfirmSection = () => {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-[#C2884E]/10">
        <CardHeader className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#C2884E] p-2 rounded-full text-white">
              <Check className="h-4 w-4" />
            </div>
            <CardTitle>{language === 'zh' ? '确认购买' : 'Confirm Purchase'}</CardTitle>
          </div>
          <CardDescription>
            {language === 'zh' 
              ? '请确认您的购买信息' 
              : 'Please confirm your purchase information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Order Summary */}
          <div className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] p-5 rounded-xl border border-[#C2884E]/10 shadow-sm">
            <h3 className="font-medium mb-4 text-[#6B5F53] flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? '订单摘要' : 'Order Summary'}
            </h3>
            
            {/* Plan details */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-dashed border-[#C2884E]/10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] w-12 h-12 rounded-full flex items-center justify-center text-white">
                    <Utensils className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[#6B5F53]">
                      {selectedPlan?.type === 'twoDish' 
                        ? (language === 'zh' ? '每餐2菜套餐' : '2-Dish Meal Plan') 
                        : (language === 'zh' ? '每餐3菜套餐' : '3-Dish Meal Plan')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan?.quantity} {language === 'zh' ? '餐券' : 'vouchers'} × ${selectedPlan?.pricePerMeal.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#C2884E]">${selectedPlan?.price}</p>
                </div>
              </div>
              
              {/* Payment details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <p className="text-[#6B5F53]">{language === 'zh' ? '付款方式' : 'Payment Method'}</p>
                  <p className="font-medium text-[#6B5F53]">Interac e-Transfer</p>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <p className="text-[#6B5F53]">{language === 'zh' ? '收款人邮箱' : 'Recipient Email'}</p>
                  <p className="font-medium text-[#6B5F53]">kapioomeal@gmail.com</p>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <p className="text-[#6B5F53]">{language === 'zh' ? '付款凭证' : 'Payment Proof'}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <p className="font-medium text-[#6B5F53]">{paymentProof?.name}</p>
                  </div>
                </div>
                {notes && (
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-[#6B5F53]">{language === 'zh' ? '备注' : 'Notes'}</p>
                    <p className="font-medium text-[#6B5F53] max-w-[250px] text-right truncate" title={notes}>{notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* What happens next */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-[#6B5F53] mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C2884E]" />
                {language === 'zh' ? '接下来会发生什么' : 'What Happens Next'}
              </h4>
              
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="bg-[#F5EDE4] w-6 h-6 rounded-full flex items-center justify-center text-[#C2884E] font-medium mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '审核请求' : 'Review Request'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '我们的团队将审核您的购买请求和付款凭证' : 'Our team will review your purchase request and payment proof'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-[#F5EDE4] w-6 h-6 rounded-full flex items-center justify-center text-[#C2884E] font-medium mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '确认付款' : 'Confirm Payment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '我们将确认收到您的e-Transfer付款' : 'We will confirm receipt of your e-Transfer payment'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-[#F5EDE4] w-6 h-6 rounded-full flex items-center justify-center text-[#C2884E] font-medium mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#6B5F53]">
                      {language === 'zh' ? '添加餐券' : 'Add Vouchers'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '餐券将添加到您的账户，您将收到确认电子邮件' : 'Vouchers will be added to your account and you will receive a confirmation email'}
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-full shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-800">
                  {language === 'zh' ? '重要提示' : 'Important Note'}
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  {language === 'zh' 
                    ? '您的购买请求将在我们确认收到付款后处理。这通常需要1-2个工作日。' 
                    : 'Your purchase request will be processed after we confirm receipt of payment. This typically takes 1-2 business days.'}
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  {language === 'zh' 
                    ? '提交后，您可以在此页面查看购买请求状态。' 
                    : 'After submission, you can check the status of your purchase request on this page.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2]/50 to-[#F5EDE4]/50">
          <Button 
            variant="outline" 
            onClick={() => setPurchaseStep('upload')}
            className="border-[#C2884E]/20 text-[#6B5F53] hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'zh' ? '返回' : 'Back'}
          </Button>
          <Button 
            onClick={handleSubmitPurchase} 
            disabled={isLoading}
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'zh' ? '提交中...' : 'Submitting...'}
              </>
            ) : (
              <>
                {language === 'zh' ? '提交购买请求' : 'Submit Purchase Request'}
                <Sparkles className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Define step indicators
  const steps = [
    { id: 'select', label: language === 'zh' ? '选择套餐' : 'Select Plan' },
    { id: 'upload', label: language === 'zh' ? '上传凭证' : 'Upload Proof' }
  ]

  // Add a counter effect for the user's current vouchers
  const [currentTwoDishVouchers, setCurrentTwoDishVouchers] = useState(0)
  const [currentThreeDishVouchers, setCurrentThreeDishVouchers] = useState(0)
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false)
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Cleanup function to set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);


  // Fetch user's current vouchers and purchase history from API
  useEffect(() => {
    // Use a flag to prevent multiple API calls
    let apiCallAttempted = false;
    
    const fetchVoucherBalance = async () => {
      if (apiCallAttempted) return;
      apiCallAttempted = true;
      
      setIsLoadingVouchers(true);
      const userData = localStorage.getItem('user');
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          
          // Just use localStorage data directly instead of API call
          // This prevents connection refused errors
          setCurrentTwoDishVouchers(user.twoDishVoucher || 0);
          setCurrentThreeDishVouchers(user.threeDishVoucher || 0);
          
        } catch (error) {
          console.error('Error parsing user data:', error);
        } finally {
          if (isMounted.current) {
            setIsLoadingVouchers(false);
          }
        }
      } else {
        if (isMounted.current) {
          setIsLoadingVouchers(false);
        }
      }
    };
    
    fetchVoucherBalance();
    
    // Check URL parameters for plan selection
    const urlParams = new URLSearchParams(window.location.search)
    const shouldSelectPlan = urlParams.get('selectPlan') === 'true'
    const urlPlanId = urlParams.get('plan')
    
    // Debug logging
    console.log('MealVoucherPurchase - URL Parameters:', {
      search: window.location.search,
      shouldSelectPlan,
      urlPlanId,
      allPlans: [...twoDishPlans, ...threeDishPlans].map(p => p.id)
    })
    
    if (shouldSelectPlan) {
      // First check if there's a plan ID in the URL
      if (urlPlanId) {
        // Find the matching plan in our available plans
        const allPlans = [...twoDishPlans, ...threeDishPlans]
        const matchingPlan = allPlans.find(p => p.id === urlPlanId)
        
        if (matchingPlan) {
          // Set the active tab based on the plan type
          setActiveTab(matchingPlan.type)
          
          // Auto-select the plan and move to upload step
          setTimeout(() => {
            handlePlanSelect(matchingPlan)
          }, 500)
        }
      }
      // If no plan ID in URL, check localStorage as fallback
      else {
        const storedPlanData = localStorage.getItem('selectedMealPlan')
        if (storedPlanData) {
          try {
            const planData = JSON.parse(storedPlanData)
            
            // Find the matching plan in our available plans
            const planType = planData.type as 'twoDish' | 'threeDish'
            setActiveTab(planType)
            
            // Find the specific plan by ID
            const plans = planType === 'twoDish' ? twoDishPlans : threeDishPlans
            const matchingPlan = plans.find(p => p.id === planData.id)
            
            if (matchingPlan) {
              // Auto-select the plan and move to upload step
              setTimeout(() => {
                handlePlanSelect(matchingPlan)
                // Clear the stored plan to prevent auto-selection on future visits
                localStorage.removeItem('selectedMealPlan')
              }, 500)
            }
          } catch (error) {
            console.error('Error parsing stored plan data:', error)
          }
        }
      }
    }
  }, [twoDishPlans, threeDishPlans])

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Region Check Dialog */}
      <RegionCheckDialogRecharge
        open={showRegionDialog}
        onClose={() => setShowRegionDialog(false)}
        currentRegion={userRegion}
        onRegionChange={handleRegionChange}
        onProceed={() => setPurchaseStep('upload')}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#C2884E] to-[#D1A46C] bg-clip-text text-transparent">
            {language === 'zh' ? '每日直送餐券' : 'Daily Delivery Meal Plan'}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] rounded-full mt-1"></div>
        </div>
        
        {/* Current voucher balance */}
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
            <Utensils className="h-4 w-4 text-[#C2884E]" />
            <span className="text-sm font-medium text-[#6B5F53]">
              {language === 'zh' ? '2菜餐券' : '2-Dish'}: 
            </span>
            <span className="text-sm font-bold text-[#C2884E]">
              {currentTwoDishVouchers}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
            <Utensils className="h-4 w-4 text-[#C2884E]" />
            <span className="text-sm font-medium text-[#6B5F53]">
              {language === 'zh' ? '3菜餐券' : '3-Dish'}: 
            </span>
            <span className="text-sm font-bold text-[#C2884E]">
              {currentThreeDishVouchers}
            </span>
          </div>
          <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EDE4] hover:bg-[#F0E5D9] text-[#C2884E] transition-all duration-300 hover:scale-110">
                <Info className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-w-[92%] overflow-hidden p-0 bg-gradient-to-b from-[#FBF7F2] to-[#F5EDE4] rounded-xl">
              <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6">
                <DialogTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {language === 'zh' ? '购买流程' : 'How It Works'}
                </DialogTitle>
              </DialogHeader>
              <motion.div 
                className="p-4 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white flex items-center justify-center font-bold shadow-md"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      1
                    </motion.div>
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <h4 className="font-medium text-[#6B5F53] text-base sm:text-lg">
                        {language === 'zh' ? '选择套餐' : 'Choose Plan'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'zh' 
                          ? '浏览可用套餐并选择最适合您需求的餐券数量' 
                          : 'Browse available plans and select the voucher quantity that best fits your needs'}
                      </p>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white flex items-center justify-center font-bold shadow-md"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      2
                    </motion.div>
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <h4 className="font-medium text-[#6B5F53] text-base sm:text-lg">
                        {language === 'zh' ? '转账付款' : 'Send Payment'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'zh' 
                          ? '通过Interac e-Transfer向指定账户转账付款' 
                          : 'Send payment via Interac e-Transfer to the designated account'}
                      </p>
                      <div className="mt-2 bg-white p-3 rounded-lg border border-[#C2884E]/10 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B5F53]">{language === 'zh' ? '收款邮箱' : 'Recipient Email'}</span>
                          <span className="font-medium">kapioomeal@gmail.com</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white flex items-center justify-center font-bold shadow-md"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      3
                    </motion.div>
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <h4 className="font-medium text-[#6B5F53] text-base sm:text-lg">
                        {language === 'zh' ? '上传凭证' : 'Upload Proof'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'zh' 
                          ? '上传付款截图或PDF作为付款证明' 
                          : 'Upload a screenshot or PDF of your payment confirmation'}
                      </p>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white flex items-center justify-center font-bold shadow-md"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      4
                    </motion.div>
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <h4 className="font-medium text-[#6B5F53] text-base sm:text-lg">
                        {language === 'zh' ? '获得餐券' : 'Receive Vouchers'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'zh' 
                          ? '我们确认付款后，会将餐券添加到您的账户' 
                          : 'After payment verification, vouchers will be added to your account within 1-2 business days'}
                      </p>
                      <div className="mt-2 bg-white p-3 rounded-lg border border-[#C2884E]/10 flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-[#6B5F53]">
                          {language === 'zh' ? '您将收到电子邮件通知' : 'You will receive an email notification'}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[#C2884E]/10">
                  <Button 
                    className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
                    onClick={() => setHowItWorksOpen(false)}
                  >
                    {language === 'zh' ? '我明白了' : 'Got it'}
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Service Area Information */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-[#C2884E]" />
          <p className="text-sm font-medium text-[#6B5F53]">
            {language === 'zh' ? '配送区域' : 'Available Areas'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAILY_DELIVERY_REGIONS.map((area) => (
            <div 
              key={area} 
              className="px-3 py-1.5 text-xs font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors duration-300"
            >
              {area === 'NorthYork' ? 'North York' : area}
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Steps */}
      <AnimatePresence mode="wait">
        {purchaseStep === 'select' && (
          <motion.div
            key="select-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#6B5F53] flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#C2884E]" />
                  {language === 'zh' ? '选择餐券套餐' : 'Choose Your Meal Plan'}
                </h3>
                {/* <div className="text-sm text-muted-foreground">
                  {language === 'zh' ? '餐券有效期：1年' : 'Vouchers valid for: 1 year'}
                </div> */}
              </div>
            </div>
            
            <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as 'twoDish' | 'threeDish')} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-8 bg-[#F5EDE4]/30 p-1 rounded-xl">
                <TabsTrigger 
                  value="twoDish" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-lg py-3 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    {language === 'zh' ? '每餐2菜' : '2-Dish Meal'}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="threeDish" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-lg py-3 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    {language === 'zh' ? '每餐3菜' : '3-Dish Meal'}
                  </div>
                </TabsTrigger>
              </TabsList>
              
              
              <AnimatePresence mode="wait">
                <TabsContent value="twoDish" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderPlanCards(twoDishPlans)}
                    
                    {/* Payment method and tax information - commented out
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <h4 className="font-medium text-amber-800 mb-2">{language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}</h4>
                      <ul className="space-y-2 text-sm text-amber-700">
                        <li className="flex items-start gap-2">
                          <div className="min-w-[20px] mt-0.5">•</div>
                          <div>{language === 'zh' ? 'Interac e-Transfer：需额外支付13%税费' : 'Interac e-Transfer: Additional 13% tax required'}</div>
                        </li>
                      </ul>
                    </div>
                    */}
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="threeDish" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderPlanCards(threeDishPlans)}
                    
                    {/* Payment method and tax information - commented out
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <h4 className="font-medium text-amber-800 mb-2">{language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}</h4>
                      <ul className="space-y-2 text-sm text-amber-700">
                        <li className="flex items-start gap-2">
                          <div className="min-w-[20px] mt-0.5">•</div>
                          <div>{language === 'zh' ? 'Interac e-Transfer：需额外支付13%税费' : 'Interac e-Transfer: Additional 13% tax required'}</div>
                        </li>
                      </ul>
                    </div>
                    */}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        )}

        {purchaseStep === 'upload' && (
          <motion.div
            key="upload-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {renderUploadSection()}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

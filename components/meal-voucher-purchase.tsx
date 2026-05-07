"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { usePromoCode } from '@/hooks/use-promo-code'
import { useRegionAddressUpdate } from '@/hooks/use-region-address-update'
import { useUserPhoneSync } from '@/hooks/use-user-phone-sync'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { PRODUCT_LINE_LABELS } from '@/lib/product-lines/names'
import { ensureUserPhone, getStoredUser } from '@/lib/phone-helper'
import { DAILY_DELIVERY_AREAS, isDailyDeliveryArea } from '@/lib/constants/areas'
import { listDailyPlans } from '@/lib/plans/service'
import type { PricingBreakdown } from '@/lib/promo-code-shared'
import {
  PaymentProofClientError,
  preparePaymentProofFile,
  uploadPaymentProof,
} from '@/lib/upload/payment-proof-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MealVoucherPlanGrid } from '@/features/meal-voucher-purchase/meal-voucher-plan-grid'
import { MealVoucherUploadStep } from '@/features/meal-voucher-purchase/meal-voucher-upload-step'
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
  CalendarDays,
  Utensils,
  MessageSquare,
  Ticket,
  Phone
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
  const { language } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'twoDish' | 'threeDish'>('twoDish')
  const [selectedPlan, setSelectedPlan] = useState<VoucherPlan | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [interacEmail, setInteracEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'upload'>('select')
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [showRegionDialog, setShowRegionDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined)
  const allDailyPlans: VoucherPlan[] = listDailyPlans().map((plan) => ({
    id: plan.id,
    type: plan.dishType,
    quantity: plan.credits,
    price: plan.basePrice,
    pricePerMeal: plan.pricePerMeal,
    isPopular: Boolean(plan.tags),
    savings: language === 'zh' ? plan.tags?.zh : plan.tags?.en
  }))

  const twoDishPlans: VoucherPlan[] = allDailyPlans.filter((plan) => plan.type === 'twoDish')
  const threeDishPlans: VoucherPlan[] = allDailyPlans.filter((plan) => plan.type === 'threeDish')

  // Use centralized daily delivery areas
  const DAILY_DELIVERY_REGIONS = DAILY_DELIVERY_AREAS

  const defaultPricing: PricingBreakdown | null = selectedPlan
    ? {
        currency: 'CAD' as const,
        originalSubtotal: selectedPlan.price,
        discountAmount: 0,
        discountedSubtotal: selectedPlan.price,
        taxRate: 0.13,
        taxAmount: parseFloat((selectedPlan.price * 0.13).toFixed(2)),
        finalTotal: parseFloat((selectedPlan.price * 1.13).toFixed(2))
      }
    : null

  const storedPromoUser = getStoredUser()
  const storedUserId = storedPromoUser?._id ?? null
  const {
    promoCodeInput,
    setPromoCodeInput,
    appliedPromoCode,
    promoBreakdown,
    isApplyingPromo,
    promoError,
    handleApplyPromo,
    handleRemovePromo,
  } = usePromoCode({
    language,
    request: selectedPlan
      ? {
          userId: storedPromoUser?._id ?? null,
          purchaseType: 'daily_topup',
          paymentMethod: 'emt',
          mealSubtotal: selectedPlan.price,
          deliveryFeeTotal: 0,
          taxRate: 0.13,
        }
      : null,
    missingUserError: language === 'zh' ? '请先登录' : 'Please log in first',
    resetKeys: [selectedPlan?.id],
    onApplySuccess: () => {
      toast({
        title: language === 'zh' ? '优惠码已应用' : 'Promo code applied',
        description: language === 'zh' ? '折扣将在税前应用。' : 'Discount is applied before tax.'
      })
    },
  })

  const effectivePricing = promoBreakdown || defaultPricing
  const discountedUnitPrice = selectedPlan && effectivePricing
    ? effectivePricing.discountedSubtotal / selectedPlan.quantity
    : null

  const { handleRegionChange } = useRegionAddressUpdate({
    onSuccess: setUserRegion,
  })

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Set loading state
    setIsLoading(true);
    
    try {
      const processedFile = await preparePaymentProofFile(file)
      setPaymentProof(processedFile)
    } catch (error) {
      console.error('Error processing file:', error);

      if (error instanceof PaymentProofClientError && error.code === 'invalid_type') {
        toast({
          title: language === 'zh' ? "无效的文件类型" : "Invalid file type",
          description: language === 'zh' ? "请上传有效的图片格式" : "Please upload a valid image format",
          variant: "destructive"
        });
      } else if (error instanceof PaymentProofClientError && error.code === 'too_large') {
        toast({
          title: language === 'zh' ? "文件过大" : "File too large",
          description: language === 'zh' ? "文件大小必须小于5MB" : "File size must be less than 5MB",
          variant: "destructive"
        });
      } else if (error instanceof PaymentProofClientError && error.code === 'conversion_failed') {
        toast({
          title: language === 'zh' ? "转换失败" : "Conversion failed",
          description: language === 'zh' ? "无法转换HEIC图片。请尝试其他格式。" : "Failed to convert HEIC image. Please try another format.",
          variant: "destructive"
        });
      } else {
        toast({
          title: language === 'zh' ? "错误" : "Error",
          description: language === 'zh' ? "处理图片失败" : "Failed to process the image",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
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
        const isValidRegion = DAILY_DELIVERY_REGIONS.includes(userProvince)
        
        // Always show the dialog to collect/confirm address details
        setUserRegion(userProvince)
        setShowRegionDialog(true)
        
        // The dialog will handle skipping the region selection if the region is valid
        return
      }
    }
    
    // If no region is set, proceed to upload step
    setPurchaseStep('upload')
    console.log('MealVoucherPurchase - Purchase step set to upload')
  }

  // Handle file upload to AWS S3
  const uploadFileToS3 = async (file: File): Promise<string> => uploadPaymentProof(file)

  // Handle payment proof upload and submission
  const handleUpload = async () => {
    if (!paymentProof) {
      toast({
        title: language === 'zh' ? "请上传付款凭证" : "Please upload payment proof",
        variant: "destructive"
      })
      return
    }
    
    if (!interacEmail) {
      toast({
        title: language === 'zh' ? "缺少电子转账邮箱" : "Missing e-Transfer email",
        description: language === 'zh' ? "请输入您用于发送电子转账的电子邮件地址" : "Please enter the email you used to send the e-Transfer",
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
      const storedUser = getStoredUser()
      if (!storedUser?._id) {
        toast({
          title: language === 'zh' ? '提交失败' : 'Submission failed',
          description: language === 'zh' ? '请先登录' : 'Please log in first',
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      const phoneResult = await ensureUserPhone({
        userId: storedUser._id,
        phoneInput: phone,
        requirePhone: true,
      })

      if (!phoneResult.ok) {
        toast({
          title: language === 'zh' ? '提交失败' : 'Submission failed',
          description:
            language === 'zh'
              ? phoneResult.errorMessage || '请检查您的手机号'
              : phoneResult.errorMessage || 'Please check your phone number',
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // 1. Upload the file to S3
      const imageProofUrl = await uploadFileToS3(paymentProof)
      
      // 2. Use validated user from getStoredUser (avoids JSON.parse throws on corrupted localStorage)
      const user = storedUser
      
      // 3. Submit the voucher purchase request
      // Note: requestId is now always generated by the backend for consistency
      const response = await fetch('/api/voucher-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user._id,
          type: selectedPlan.type,
          quantity: selectedPlan.quantity,
          planId: selectedPlan.id,
          amount: effectivePricing?.finalTotal,
          originalPrice: effectivePricing?.originalSubtotal,
          taxRate: effectivePricing?.taxRate,
          imageProof: imageProofUrl,
          referenceNumber: interacEmail,
          notes: notes || undefined,
          promoCode: appliedPromoCode || undefined
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || errorData.errorCode || 'Failed to submit purchase request'
        )
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

  const handleResetPurchaseFlow = () => {
    setIsSubmitted(false)
    setSelectedPlan(null)
    setPaymentProof(null)
    setNotes('')
    setPurchaseStep('select')
  }

  // Add a counter effect for the user's current vouchers
  const [currentTwoDishVouchers, setCurrentTwoDishVouchers] = useState(0)
  const [currentThreeDishVouchers, setCurrentThreeDishVouchers] = useState(0)
  // Prefill phone from stored user profile if available
  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser?.phone) {
      setPhone(storedUser.phone)
    }
  }, [])

  useUserPhoneSync({ phone, userId: storedUserId })
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Flag to track if plan selection from URL has been processed
  const planSelectionProcessed = useRef(false);
  
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
          // no-op
        }
      }
    };
    
    fetchVoucherBalance();
    
    // Check URL parameters for plan selection - only if not already processed
    if (!planSelectionProcessed.current) {
      const urlParams = new URLSearchParams(window.location.search)
      const shouldSelectPlan = urlParams.get('selectPlan') === 'true'
      const urlPlanId = urlParams.get('plan')
      
      // Debug logging - only log once
      console.log('MealVoucherPurchase - URL Parameters:', {
        search: window.location.search,
        shouldSelectPlan,
        urlPlanId,
        allPlans: [...twoDishPlans, ...threeDishPlans].map(p => p.id)
      })
      
      if (shouldSelectPlan && urlPlanId) {
        // Find the matching plan in our available plans
        const allPlans = [...twoDishPlans, ...threeDishPlans]
        const matchingPlan = allPlans.find(p => p.id === urlPlanId)
        
        if (matchingPlan) {
          // Set the active tab based on the plan type
          setActiveTab(matchingPlan.type)
          
          // Auto-select the plan and move to upload step
          setTimeout(() => {
            if (isMounted.current && !planSelectionProcessed.current) {
              handlePlanSelect(matchingPlan)
              // Mark as processed to prevent repeated execution
              planSelectionProcessed.current = true
            }
          }, 500)
        }
      }
      // If no plan ID in URL, check localStorage as fallback
      else if (shouldSelectPlan) {
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
                if (isMounted.current && !planSelectionProcessed.current) {
                  handlePlanSelect(matchingPlan)
                  // Clear the stored plan to prevent auto-selection on future visits
                  localStorage.removeItem('selectedMealPlan')
                  // Mark as processed to prevent repeated execution
                  planSelectionProcessed.current = true
                }
              }, 500)
            }
          } catch (error) {
            console.error('Error parsing stored plan data:', error)
          }
        }
      }
      
      // Mark as processed even if no plan was selected to prevent future processing
      planSelectionProcessed.current = true
    }
  }, [twoDishPlans, threeDishPlans, handlePlanSelect, setActiveTab])

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Region Check Dialog */}
      {showRegionDialog && (
        <RegionCheckDialogRecharge
          open={showRegionDialog}
          onClose={() => setShowRegionDialog(false)}
          currentRegion={userRegion}
          onRegionChange={handleRegionChange}
          onProceed={() => setPurchaseStep('upload')}
          isValidRegion={isDailyDeliveryArea(userRegion || '')}
          existingAddress={(() => {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              const user = JSON.parse(storedUser)
              return user.address
            }
            return undefined
          })()}
        />
      )}
      {/* New Header Design matching Daily Delivery Page */}
      <div className="bg-gradient-to-br from-[#FFF6EF] to-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#C2884E]/10 mb-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left column - Title and description */}
          <div className="md:w-1/2">
            <div className="inline-flex items-center mb-4">
              <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                <span className="text-sm font-medium text-[#C2884E]">
                  {language === 'zh' ? `${PRODUCT_LINE_LABELS.daily.zh}计划` : `${PRODUCT_LINE_LABELS.daily.en} plan`}
                </span>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold mb-4 text-[#6B5F53]">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === 'zh' ? '每日新鲜' : 'Daily Fresh'}
              </span>
              <span className="block mt-1">
                {language === 'zh' ? '直送到家' : 'Delivered to Your Door'}
              </span>
            </h2>
            
            <p className="text-base md:text-lg text-[#6B5F53]/80 mb-6">
              {language === 'zh' 
                ? '适合注重新鲜度，追求每日现做品质的你' 
                : 'Perfect for: Those who value freshness and daily prepared quality meals'}
            </p>
            
            {/* Current voucher balance */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '2菜餐券' : '2-Dish Voucher'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {currentTwoDishVouchers}{language === 'zh' ? '张' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-[#6B5F53]">
                  {language === 'zh' ? '3菜餐券' : '3-Dish Voucher'}: 
                </span>
                <span className="text-sm font-bold text-[#C2884E]">
                  {currentThreeDishVouchers}{language === 'zh' ? '张' : ''}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-[#C2884E] text-[#C2884E] hover:bg-[#C2884E]/5 transition-all duration-300"
                  >
                    {language === 'zh' ? '了解更多' : 'Learn More'}
                  </Button>
                </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 rounded-xl sm:rounded-[24px] overflow-hidden border-0 sm:border-[#C2884E]/10 max-h-[85vh] shadow-xl">
              <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  {language === 'zh' ? `${PRODUCT_LINE_LABELS.daily.zh}计划详情` : `${PRODUCT_LINE_LABELS.daily.en} plan details`}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
                  {language === 'zh' ? '了解我们的每日新鲜配送服务' : 'Learn about our daily fresh delivery service'}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-brand">
                <Tabs defaultValue="howItWorks" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6 bg-[#F5EDE4]/30 p-1 rounded-[20px]">
                    <TabsTrigger 
                      value="description" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-[14px] py-3 transition-all duration-300"
                    >
                      {language === 'zh' ? '产品介绍' : 'Product Description'}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="howItWorks" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C2884E] data-[state=active]:to-[#D1A46C] data-[state=active]:text-white font-medium rounded-[14px] py-3 transition-all duration-300"
                    >
                      {language === 'zh' ? '如何运作' : 'How It Works'}
                    </TabsTrigger>
                  </TabsList>
                  
                  <style jsx global>{`
                    .scrollbar-brand::-webkit-scrollbar {
                      width: 5px;
                      height: 5px;
                    }
                    .scrollbar-brand::-webkit-scrollbar-track {
                      background: #F5EDE4;
                    }
                    .scrollbar-brand::-webkit-scrollbar-thumb {
                      background: linear-gradient(to bottom, #C2884E, #D1A46C);
                      border-radius: 20px;
                    }
                  `}</style>
                  
                  <TabsContent value="description" className="mt-0 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                          <Check className="w-5 h-5 text-[#C2884E]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '每日新鲜现做' : 'Freshly Made Daily'}</h3>
                          <p className="text-[#6B5F53]/80">{language === 'zh' ? '直送上门，满分新鲜度。我们坚持每日现做，确保您收到的餐食保持最佳口感和营养价值。' : 'Delivered to your door, maximum freshness. We make meals fresh daily to ensure you receive the best taste and nutritional value.'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                          <Check className="w-5 h-5 text-[#C2884E]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '餐券制' : 'Credit-Based System'}</h3>
                          <p className="text-[#6B5F53]/80">{language === 'zh' ? '购买餐券后，可根据个人需求灵活下单，自由选择使用日期——不浪费，更灵活' : 'After purchasing credits, order flexibly based on your needs and freely choose when to use them—no waste, more flexibility'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center mt-1 flex-shrink-0">
                          <Check className="w-5 h-5 text-[#C2884E]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#6B5F53] mb-1">{language === 'zh' ? '午间时段送达' : 'Lunch Time Delivery'}</h3>
                          <p className="text-[#6B5F53]/80">{language === 'zh' ? '配送时间为 11AM-1PM。 开始配送后，您将收到包含预计送达时间的短信通知。' : 'Delivery time is 11AM-1PM. Once delivery starts, you will receive an SMS notification with the estimated arrival time.'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#FFF6EF] rounded-xl p-6 mt-4">
                      <h3 className="text-lg font-medium text-[#C2884E] mb-4">适合人群</h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                          <span className="text-[#6B5F53]">注重健康饮食、关注餐食新鲜度的美食爱好者</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                          <span className="text-[#6B5F53]">追求高品质食材、坚持每日新鲜制作的你</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                          <span className="text-[#6B5F53]">学业或工作繁忙但不愿放弃健康饮食的人士</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                          <span className="text-[#6B5F53]">寻求灵活订阅方案、可自由安排配送日程的你</span>
                        </li>
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="howItWorks" className="mt-0 space-y-4">
                    <div className="space-y-8">
                      <h3 className="text-xl font-semibold text-[#6B5F53] mb-4">如何运作</h3>
                      
                      {/* Step 1 */}
                      <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-[#C2884E]" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">1</span>
                            购买餐劵
                          </h3>
                          <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                            通过官网使用 电子转账（EMT）充值餐劵，餐劵会自动记录到您的账户中。
                          </p>
                        </div>
                      </div>
                      
                      {/* Step 2 */}
                      <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-[#C2884E]" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">2</span>
                            使用餐劵下单
                          </h3>
                          <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                            每周菜单定期更新，进入您的个人账户，选择餐食，使用账户内餐劵下单即可，订1餐扣1张
                          </p>
                          <div className="mt-2 flex items-center">
                            <Clock className="h-4 w-4 text-[#C2884E] mr-1.5" />
                            <span className="text-xs font-medium text-[#C2884E]">下单截止时间：配送日前一天上午 11:59。</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 3 */}
                      <div className="flex flex-row gap-4 items-start bg-white/80 p-4 rounded-xl border border-[#F5EDE4] shadow-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#C2884E]/10 to-[#D1A46C]/10 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#FBF7F2] flex items-center justify-center">
                            <Utensils className="w-5 h-5 text-[#C2884E]" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-[#6B5F53] flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C2884E]/10 text-[#C2884E] text-sm font-semibold mr-2">3</span>
                            每日新鲜中央厨房新鲜现做，中午配送～
                          </h3>
                          <p className="text-sm text-[#6B5F53]/80 mt-2 leading-relaxed">
                            上午 11 点至下午 1 点 之间准时送达，确保新鲜与美味。
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#FFF6EF] rounded-xl p-6 mt-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#C2884E]/10 flex items-center justify-center">
                          <Info className="w-5 h-5 text-[#C2884E]" />
                        </div>
                        <h3 className="text-lg font-medium text-[#C2884E]">配送要求</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]"></div>
                        <div className="flex items-center">
                          <span className="text-[#6B5F53] font-medium">每次配送至少2份餐食</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#6B5F53]/80 mt-2">我们提供多样化的菜单选择，满足您对不同口味的需求。每周更新菜单，让您的味蕾永远充满惊喜。</p>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[#C2884E]/10">
                  <Button 
                    className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
                    onClick={() => setHowItWorksOpen(false)}
                  >
                    {language === 'zh' ? '我明白了' : 'Got it'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Purchase Button - Mobile Only */}
          <Button 
            variant="default"
            size="sm"
            className="md:hidden bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white transition-all duration-300"
            onClick={() => {
              const element = document.getElementById('daily-service-area-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            {language === 'zh' ? '购买餐券' : 'Purchase Vouchers'}
          </Button>
            </div>
          </div>
          
          {/* Right column - Feature tags */}
          <div className="md:w-1/2 flex flex-col justify-center">
            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="group flex items-center gap-4 p-1">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                  <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                    <Utensils className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                    {language === 'zh' ? '每日新鲜现做' : 'Freshly Made Daily'}
                  </p>
                  <p className="text-sm text-[#6B5F53]/80">
                    {language === 'zh' ? '直送上门，满分新鲜度' : 'Delivered to your door, maximum freshness'}
                  </p>
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="group flex items-center gap-4 p-1">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                  <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                    <Ticket className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                    {language === 'zh' ? '餐券制' : 'Credit-Based System'}
                  </p>
                  <p className="text-sm text-[#6B5F53]/80">
                    {language === 'zh' ? '需要哪天就点哪天，灵活不浪费～' : 'Order only when you need, flexible and no waste'}
                  </p>
                </div>
              </div>
              
              {/* Feature 3 */}
              <div className="group flex items-center gap-4 p-1">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                  <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">
                    {language === 'zh' ? '午间时段送达' : 'Lunch Time Delivery'}
                  </p>
                  <p className="text-sm text-[#6B5F53]/80">
                    {language === 'zh' ? '11AM-1PM，享受当日鲜美' : '11AM-1PM, enjoy fresh flavors of the day'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Area Information */}
      <div id="daily-service-area-section" className="mb-8">
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
              {area}
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
            <div id="daily-meal-plans-section" className="mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#6B5F53] flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#C2884E]" />
                  {language === 'zh' ? '选择餐券套餐' : 'Choose Your Meal Plan'}
                </h3>
                {/* <div className="text-sm text-muted-foreground">
                  {language === 'zh' ? '餐券有效期：半年' : 'Vouchers valid for: 6 months'}
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
              
              
              {/* Removed AnimatePresence causing key errors */}
                <TabsContent value="twoDish" className="mt-0">
                  <motion.div
                    key="twoDish-tab-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MealVoucherPlanGrid
                      language={language}
                      plans={twoDishPlans}
                      selectedPlanId={selectedPlan?.id}
                      onSelectPlan={handlePlanSelect}
                    />
                    
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
                    key="threeDish-tab-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MealVoucherPlanGrid
                      language={language}
                      plans={threeDishPlans}
                      selectedPlanId={selectedPlan?.id}
                      onSelectPlan={handlePlanSelect}
                    />
                    
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
            <MealVoucherUploadStep
              appliedPromoCode={appliedPromoCode}
              discountedUnitPrice={discountedUnitPrice}
              effectivePricing={effectivePricing}
              fileInputRef={fileInputRef}
              handleApplyPromo={handleApplyPromo}
              handleFileChange={handleFileChange}
              handleRemovePromo={handleRemovePromo}
              interacEmail={interacEmail}
              isApplyingPromo={isApplyingPromo}
              isLoading={isLoading}
              isSubmitted={isSubmitted}
              language={language}
              notes={notes}
              onBack={() => setPurchaseStep('select')}
              onInteracEmailChange={setInteracEmail}
              onNotesChange={setNotes}
              onPhoneChange={setPhone}
              onPromoCodeInputChange={setPromoCodeInput}
              onReset={handleResetPurchaseFlow}
              onSubmit={handleUpload}
              paymentProof={paymentProof}
              phone={phone}
              promoCodeInput={promoCodeInput}
              promoError={promoError}
              selectedPlan={selectedPlan}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AlertCircle,
  CheckCircle,
  CreditCard, 
  Upload, 
  X, 
  Loader2, 
  Check, 
  Clock, 
  Calendar,
  Truck,
  Star,
  ChevronRight,
  ChevronLeft,
  Info,
  Ticket
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { listWeeklyPlans } from "@/lib/plans/service"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WeeklyAddressDialog } from '@/components/weekly-address-dialog'
import { usePromoCode } from "@/hooks/use-promo-code"
import { useRegionAddressUpdate } from "@/hooks/use-region-address-update"
import { useUserPhoneSync } from "@/hooks/use-user-phone-sync"
import { CreditUploadStep } from "@/features/credit-purchase/credit-upload-step"
import { CreditMealCountStep } from "@/features/credit-purchase/credit-meal-count-step"
import { CreditPlanSelectStep } from "@/features/credit-purchase/credit-plan-select-step"
import { ensureUserPhone, getStoredUser } from "@/lib/phone-helper"
import type { PricingBreakdown } from "@/lib/promo-code-shared"
import { useObjectUrl } from "@/hooks/use-object-url"
import {
  PaymentProofClientError,
  preparePaymentProofFile,
  uploadPaymentProof,
} from "@/lib/upload/payment-proof-client"

interface CreditPurchasePlansProps {
  userId: string;
  onSuccess?: () => void;
}

  // Define plan types
interface PlanOption {
  id: string;
  duration: 1 | 2 | 4 | 8;
  durationLabel: string;
  durationLabelZh: string;
  mealsPerWeek: 6 | 8 | 10 | 12 | 16;
  totalPrice: number;
  pricePerMeal: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  tag?: string;
  tagZh?: string;
}

export function CreditPurchasePlans({ userId, onSuccess }: CreditPurchasePlansProps) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selectedMealsPerWeek, setSelectedMealsPerWeek] = useState<6 | 8 | 10 | 12 | 16>(6)
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null)
  const [purchaseStep, setPurchaseStep] = useState<'mealSelect' | 'planSelect' | 'upload'>('mealSelect')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [interacEmail, setInteracEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'emt' | null>('emt') // Default to EMT
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [showAddressDialog, setShowAddressDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string>("")
  const [selectedPlanTemp, setSelectedPlanTemp] = useState<PlanOption | null>(null)
  const paymentProofPreviewUrl = useObjectUrl(paymentProof)

  const durationLabels: Record<number, { en: string; zh: string }> = {
    1: { en: 'One week credit', zh: '1周次卡券' },
    2: { en: 'Two weeks credit', zh: '2周次卡券' },
    4: { en: 'Four weeks credit', zh: '4周次卡券' },
    8: { en: 'Eight weeks credit', zh: '8周次卡券' }
  }

  const planOptions: PlanOption[] = listWeeklyPlans().map((plan) => ({
    id: plan.id,
    duration: plan.weeks as 1 | 2 | 4 | 8,
    durationLabel: durationLabels[plan.weeks]?.en || `${plan.weeks} weeks credit`,
    durationLabelZh: durationLabels[plan.weeks]?.zh || `${plan.weeks}周次卡券`,
    mealsPerWeek: plan.mealsPerWeek as 6 | 8 | 10 | 12 | 16,
    totalPrice: plan.basePrice,
    pricePerMeal: plan.pricePerMeal,
    isRecommended: plan.weeks === 2,
    isPopular: plan.weeks === 8,
    tag: plan.tags?.en,
    tagZh: plan.tags?.zh
  }))

  // Get filtered plans based on selected meals per week
  const filteredPlans = planOptions.filter(plan => plan.mealsPerWeek === selectedMealsPerWeek)
  
  // Listen for the custom event to open the info dialog
  useEffect(() => {
    const handleOpenInfoDialog = () => {
      setHowItWorksOpen(true)
    }
    
    document.addEventListener('openInfoDialog', handleOpenInfoDialog)
    
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener('openInfoDialog', handleOpenInfoDialog)
    }
  }, [])

  // Check URL parameters for plan selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const shouldSelectPlan = urlParams.get('selectPlan') === 'true'
      const urlPlanId = urlParams.get('plan')
      
      // Debug logging
      console.log('CreditPurchasePlans - URL Parameters:', {
        search: window.location.search,
        shouldSelectPlan,
        urlPlanId,
        allPlans: planOptions.map(p => p.id)
      })
      
      if (shouldSelectPlan) {
        // First check if there's a plan ID in the URL
        if (urlPlanId) {
          // Find the matching plan in our available plans
          const matchingPlan = planOptions.find(p => p.id === urlPlanId)
          
          if (matchingPlan) {
            // Set the meals per week based on the plan
            setSelectedMealsPerWeek(matchingPlan.mealsPerWeek as 6 | 8 | 10 | 12 | 16)
            
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
              
              // Set the meals per week based on the stored plan
              if (planData.mealsPerWeek) {
                setSelectedMealsPerWeek(planData.mealsPerWeek as 6 | 8 | 10 | 12 | 16)
              }
              
              // Find the specific plan by ID
              const matchingPlan = planOptions.find(p => p.id === planData.id)
              
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
    }
  }, [])

  // Prefill phone from stored user profile if available
  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser?.phone) {
      setPhone(storedUser.phone)
    }
  }, [])

  useUserPhoneSync({ phone, userId })

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

  // Handle meal count selection
  const handleMealCountSelect = (mealCount: 6 | 8 | 10 | 12 | 16) => {
    setSelectedMealsPerWeek(mealCount)
    setPurchaseStep('planSelect')
  }
  
  const { handleRegionChange } = useRegionAddressUpdate({
    userId,
    onSuccess: setUserRegion,
  })
  
  // Proceed to upload step after address confirmation
  const proceedToUpload = () => {
    if (selectedPlanTemp) {
      setSelectedPlan(selectedPlanTemp)
      setSelectedPlanTemp(null)
      setPurchaseStep('upload')
    }
  }
  
  // Function to determine delivery fee based on region
  const getDeliveryFee = (region: string): number => {
    // Higher delivery fee for Hamilton and Burlington areas
    if (region === 'Hamilton' || region === 'Burlington') {
      return 15.99;
    }
    // Standard delivery fee for all other areas
    return 11.99;
  }

  const baseSubtotal =
    selectedPlan ? selectedPlan.totalPrice + getDeliveryFee(userRegion || '') * selectedPlan.duration : 0

  const defaultPricing: PricingBreakdown | null = selectedPlan
    ? {
        currency: 'CAD',
        originalSubtotal: parseFloat(baseSubtotal.toFixed(2)),
        discountAmount: 0,
        discountedSubtotal: parseFloat(baseSubtotal.toFixed(2)),
        taxRate: paymentMethod === 'emt' ? 0.13 : 0,
        taxAmount: paymentMethod === 'emt' ? parseFloat((baseSubtotal * 0.13).toFixed(2)) : 0,
        finalTotal:
          paymentMethod === 'emt'
            ? parseFloat((baseSubtotal * 1.13).toFixed(2))
            : parseFloat((baseSubtotal * 0.9).toFixed(2))
      }
    : null

  const weeklyPromoAvailabilityError =
    paymentMethod !== 'emt'
      ? language === 'zh'
        ? '优惠码仅支持 EMT 付款方式'
        : 'Promo code only supports EMT payment'
      : null

  const {
    promoCodeInput,
    setPromoCodeInput,
    appliedPromoCode,
    promoBreakdown,
    promoError,
    isApplyingPromo,
    handleApplyPromo,
    handleRemovePromo,
    resetPromo,
  } = usePromoCode({
    language,
    request: selectedPlan
      ? {
          userId,
          purchaseType: 'weekly_topup',
          paymentMethod: 'emt',
          mealSubtotal: parseFloat((selectedPlan.totalPrice || 0).toFixed(2)),
          deliveryFeeTotal: parseFloat((getDeliveryFee(userRegion || '') * (selectedPlan.duration || 0)).toFixed(2)),
          taxRate: 0.13,
        }
      : null,
    availabilityError: weeklyPromoAvailabilityError,
    resetKeys: [selectedPlan?.id, paymentMethod, userRegion],
    onApplySuccess: () => {
      toast({
        title: language === 'zh' ? '优惠码已应用' : 'Promo code applied',
        description: language === 'zh' ? '折扣将在税前应用。' : 'Discount is applied before tax.'
      })
    },
  })

  const effectivePricing = promoBreakdown || defaultPricing
  const totalMealsInSelectedPlan = selectedPlan ? selectedPlan.mealsPerWeek * selectedPlan.duration : 0
  
  // Calculate unit price using only the meal price portion (excluding delivery fee)
  const discountedUnitPrice =
    selectedPlan && effectivePricing && totalMealsInSelectedPlan > 0
      ? (() => {
          const deliveryFeeTotal = getDeliveryFee(userRegion || '') * selectedPlan.duration
          const mealPriceOnly = effectivePricing.discountedSubtotal - deliveryFeeTotal
          return mealPriceOnly / totalMealsInSelectedPlan
        })()
      : null

  // Handle plan selection
  const handlePlanSelect = (plan: PlanOption) => {
    // Get user data and region
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      if (user.address && user.address.province) {
        setUserRegion(user.address.province)
      }
    }
    
    // Store the selected plan temporarily
    setSelectedPlanTemp(plan)
    
    // Show address confirmation dialog
    setShowAddressDialog(true)
  }

  // Go back to meal count selection
  const handleBackToMealSelect = () => {
    setPurchaseStep('mealSelect')
  }

  // Handle file upload to AWS S3
  const uploadFileToS3 = async (file: File): Promise<string> => uploadPaymentProof(file)

  // Handle purchase submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPlan || !paymentProof || !interacEmail) {
      let errorTitle = language === 'zh' ? '请完成所有必填项' : 'Please complete all required fields'
      let errorDescription = ''
      
      if (!selectedPlan) {
        errorDescription = language === 'zh' ? '请选择一个套餐' : 'Please select a plan'
      } else if (!paymentProof) {
        errorDescription = language === 'zh' ? '请上传付款凭证' : 'Please upload your payment proof'
      } else if (!interacEmail) {
        errorDescription = language === 'zh' ? '请输入您用于发送电子转账的电子邮件地址' : 'Please enter the email you used to send the e-Transfer'
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const isPromoUsed =
        !!appliedPromoCode || promoCodeInput.trim() !== ''

      // Phone is mandatory for all credit purchase requests
      const phoneResult = await ensureUserPhone({
        userId,
        phoneInput: phone,
        requirePhone: true,
      })

      if (!phoneResult.ok) {
        toast({
          title: language === 'zh' ? '提交失败' : 'Submission Failed',
          description:
            language === 'zh'
              ? phoneResult.errorMessage || '请检查您的手机号'
              : phoneResult.errorMessage || 'Please check your phone number',
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Upload payment proof to S3
      const imageUrl = await uploadFileToS3(paymentProof)
      
      // Create plan description for admin view
      const planDescription = language === 'zh' 
        ? `${selectedPlan.mealsPerWeek}餐一周: ${selectedPlan.duration}星期` 
        : `${selectedPlan.mealsPerWeek} meals/week: ${selectedPlan.duration} ${selectedPlan.duration === 1 ? 'week' : 'weeks'}`;
      
      // Determine meal plan type based on selected plan
      let mealPlanType: '6aweek' | '8aweek' | '10aweek' | '12aweek' | '16aweek';
      if (selectedPlan.mealsPerWeek === 6) mealPlanType = '6aweek';
      else if (selectedPlan.mealsPerWeek === 8) mealPlanType = '8aweek';
      else if (selectedPlan.mealsPerWeek === 10) mealPlanType = '10aweek';
      else if (selectedPlan.mealsPerWeek === 12) mealPlanType = '12aweek';
      else mealPlanType = '16aweek';
      
      // Calculate the final amount based on payment method
      const deliveryFee = getDeliveryFee(userRegion || '');
      const originalPrice = selectedPlan.totalPrice + (deliveryFee * selectedPlan.duration); // Plan price + delivery fee
      let finalAmount = effectivePricing?.finalTotal ?? originalPrice;
      
      // If no payment method is selected, default to 'emt'
      const effectivePaymentMethod = paymentMethod || 'emt';
      
      if (effectivePaymentMethod === 'wechat') {
        // WeChat gets 10% discount
        finalAmount = parseFloat((originalPrice * 0.9).toFixed(2));
        if (appliedPromoCode) {
          throw new Error(language === 'zh' ? '微信支付不支持优惠码' : 'Promo code is not available for WeChat payment')
        }
      } else if (effectivePaymentMethod === 'emt') {
        finalAmount = effectivePricing?.finalTotal ?? parseFloat((originalPrice * 1.13).toFixed(2));
      }
      
      // Submit request to backend
      // Note: requestId is now always generated by the backend for consistency
      const response = await fetch('/api/credits/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount: finalAmount,
          originalPrice: effectivePricing?.originalSubtotal ?? originalPrice,
          paymentMethod: effectivePaymentMethod,
          mealsPerWeek: selectedPlan.mealsPerWeek,
          duration: selectedPlan.duration,
          planDescription: planDescription,
          imageProof: imageUrl,
          referenceNumber: interacEmail,
          notes,
          mealPlanType,
          mealPlanQuantity: selectedPlan.duration,
          planId: selectedPlan.id,
          promoCode: appliedPromoCode || undefined
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || result.errorCode || 'Failed to submit request')
      }
      
      // Show success message
      setIsSubmitted(true)
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting purchase request:', error)
      toast({
        title: language === 'zh' ? '提交失败' : 'Submission Failed',
        description:
          error instanceof Error && error.message
            ? error.message
            : (language === 'zh' ? '请稍后再试' : 'Please try again later'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when going back to plan selection
  const handleBackToPlans = () => {
    setPurchaseStep('planSelect')
    setSelectedPlan(null)
    setPaymentProof(null)
    setInteracEmail('')
    setNotes('')
    setPromoCodeInput('')
    resetPromo()
  }

  return (
    <div className="space-y-6">
      {/* Address Confirmation Dialog */}
      {showAddressDialog && (
        <WeeklyAddressDialog
          open={showAddressDialog}
          onClose={() => setShowAddressDialog(false)}
          currentRegion={userRegion}
          onRegionChange={handleRegionChange}
          onProceed={proceedToUpload}
          existingAddress={(() => {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              const user = JSON.parse(storedUser)
              return user.address ? { ...user.address, addressGeo: user.addressGeo } : undefined
            }
            return undefined
          })()}
        />
      )}
      
      {/* Info dialog - triggered from dashboard */}
      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#6B5F53]">
              {language === 'zh' ? '配送信息' : 'Delivery Information'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-[#F5EDE4]">
                <Truck className="h-4 w-4 text-[#C2884E]" />
              </div>
              <div>
                <h4 className="font-medium text-[#6B5F53]">
                  {language === 'zh' ? '配送日期' : 'Delivery Days'}
                </h4>
                <p className="text-sm text-[#8A7968]">
                  {language === 'zh' ? '周日和周二' : 'Sunday and Tuesday'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-[#F5EDE4]">
                <Clock className="h-4 w-4 text-[#C2884E]" />
              </div>
              <div>
                <h4 className="font-medium text-[#6B5F53]">
                  {language === 'zh' ? '配送时间' : 'Delivery Time'}
                </h4>
                <p className="text-sm text-[#8A7968]">
                  {language === 'zh' ? '下午6点 - 晚上10点' : '6PM - 10PM'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-[#F5EDE4]">
                <Calendar className="h-4 w-4 text-[#C2884E]" />
              </div>
              <div>
                <h4 className="font-medium text-[#6B5F53]">
                  {language === 'zh' ? '餐券有效期' : 'Credit Validity'}
                </h4>
                <p className="text-sm text-[#8A7968]">
                  {language === 'zh' ? '购买后半年内有效，可转让，购买后7天内可退款未用部分' : 'Valid for 6 months, transferable, unused portion refundable within 7 days of purchase'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-[#F5EDE4]">
                <CreditCard className="h-4 w-4 text-[#C2884E]" />
              </div>
              <div>
                <h4 className="font-medium text-[#6B5F53]">
                  {language === 'zh' ? '付款方式' : 'Payment Method'}
                </h4>
                <p className="text-sm text-[#8A7968]">
                  {language === 'zh' ? 'EMT/微信支付' : 'EMT/WeChat Pay'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-[#F5EDE4]">
                <Truck className="h-4 w-4 text-[#C2884E]" />
              </div>
              <div>
                <h4 className="font-medium text-[#6B5F53]">
                  {language === 'zh' ? '配送费' : 'Delivery Fee'}
                </h4>
                <p className="text-sm text-[#8A7968]">
                  {language === 'zh' 
                    ? `$${getDeliveryFee(userRegion || '')}/周 (2次配送)` 
                    : `$${getDeliveryFee(userRegion || '')}/week (2 deliveries)`}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AnimatePresence mode="wait">
        {purchaseStep === 'mealSelect' ? (
          <CreditMealCountStep
            language={language}
            onSelectMealCount={handleMealCountSelect}
          />
        ) : purchaseStep === 'planSelect' ? (
          <CreditPlanSelectStep
            filteredPlans={filteredPlans}
            getDeliveryFee={getDeliveryFee}
            language={language}
            onBack={handleBackToMealSelect}
            onSelectPlan={handlePlanSelect}
            selectedMealsPerWeek={selectedMealsPerWeek}
            userRegion={userRegion}
          />
        ) : (
          <CreditUploadStep
            appliedPromoCode={appliedPromoCode}
            baseSubtotal={baseSubtotal}
            discountedUnitPrice={discountedUnitPrice}
            effectivePricing={effectivePricing}
            fileInputRef={fileInputRef}
            getDeliveryFee={getDeliveryFee}
            handleApplyPromo={handleApplyPromo}
            handleBackToPlans={handleBackToPlans}
            handleFileChange={handleFileChange}
            handleRemovePromo={handleRemovePromo}
            handleSubmit={handleSubmit}
            interacEmail={interacEmail}
            isApplyingPromo={isApplyingPromo}
            isLoading={isLoading}
            isSubmitted={isSubmitted}
            language={language}
            notes={notes}
            onInteracEmailChange={setInteracEmail}
            onNotesChange={setNotes}
            onPaymentMethodChange={setPaymentMethod}
            onPhoneChange={setPhone}
            onPromoCodeInputChange={setPromoCodeInput}
            onRemovePaymentProof={() => setPaymentProof(null)}
            paymentMethod={paymentMethod}
            paymentProof={paymentProof}
            paymentProofPreviewUrl={paymentProofPreviewUrl}
            phone={phone}
            promoCodeInput={promoCodeInput}
            promoError={promoError}
            selectedPlan={selectedPlan}
            userRegion={userRegion}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import heic2any from "heic2any"
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
import { ensureUserPhone, getStoredUser } from "@/lib/phone-helper"

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

interface PromoPreviewBreakdown {
  currency: 'CAD';
  originalSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxRate: number;
  taxAmount: number;
  finalTotal: number;
}

export function CreditPurchasePlans({ userId, onSuccess }: CreditPurchasePlansProps) {
  const { t, language } = useLanguage()
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
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoBreakdown, setPromoBreakdown] = useState<PromoPreviewBreakdown | null>(null)
  const [promoError, setPromoError] = useState('')
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)

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

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp'];
      
      // Check if file is HEIC/HEIF
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                    (file.type === '' && (file.name.endsWith('.heic') || file.name.endsWith('.heif')));
      
      if (!validTypes.includes(file.type) && !isHeic) {
        toast({
          title: language === 'zh' ? "无效的文件类型" : "Invalid file type",
          description: language === 'zh' ? "请上传有效的图片格式" : "Please upload a valid image format",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: language === 'zh' ? "文件过大" : "File too large",
          description: language === 'zh' ? "文件大小必须小于10MB" : "File size must be less than 10MB",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      let processedFile = file;
      
      // Convert HEIC/HEIF to JPEG if needed
      if (isHeic) {
        try {
          // Convert HEIC to JPEG using heic2any (silently, without toast notifications)
          const jpegBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
          }) as Blob;
          
          // Create a new file from the JPEG blob
          processedFile = new File([jpegBlob], file.name.replace(/\.heic|\.heif/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: new Date().getTime()
          });
        } catch (conversionError) {
          console.error('Error converting HEIC to JPEG:', conversionError);
          toast({
            title: language === 'zh' ? "转换失败" : "Conversion failed",
            description: language === 'zh' ? "无法转换HEIC图片。请尝试其他格式。" : "Failed to convert HEIC image. Please try another format.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Set the processed file
      setPaymentProof(processedFile);
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: language === 'zh' ? "错误" : "Error",
        description: language === 'zh' ? "处理图片失败" : "Failed to process the image",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }

  // Handle meal count selection
  const handleMealCountSelect = (mealCount: 6 | 8 | 10 | 12 | 16) => {
    setSelectedMealsPerWeek(mealCount)
    setPurchaseStep('planSelect')
  }
  
  // Handle region change from dialog
  const handleRegionChange = async (region: string, addressData?: any): Promise<void> => {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('User not logged in')
      }
      
      const user = JSON.parse(userData)
      
      // Update user's address with the new region and optional address data
      let updatedAddress = {
        ...user.address,
        province: region
      }
      
      // If additional address data is provided, merge it with the updated address
      if (addressData) {
        updatedAddress = {
          ...updatedAddress,
          unitNumber: addressData.unitNumber !== undefined ? addressData.unitNumber : updatedAddress.unitNumber,
          streetAddress: addressData.streetAddress !== undefined ? addressData.streetAddress : updatedAddress.streetAddress,
          city: addressData.city !== undefined ? addressData.city : updatedAddress.city,
          postalCode: addressData.postalCode !== undefined ? addressData.postalCode : updatedAddress.postalCode,
          country: addressData.country !== undefined ? addressData.country : 'Canada',
          buzzCode: addressData.buzzCode !== undefined ? addressData.buzzCode : updatedAddress.buzzCode
        }
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
        
        const toastMessage = addressData 
          ? (language === 'zh' ? "地址已更新" : "Address Updated") 
          : (language === 'zh' ? "区域已更新" : "Region Updated")
          
        const toastDescription = addressData
          ? (language === 'zh' ? "您的配送地址已成功更新" : "Your delivery address has been successfully updated")
          : (language === 'zh' ? "您的区域已成功更新" : "Your region has been successfully updated")
        
        toast({
          title: toastMessage,
          description: toastDescription
        })
      } else {
        throw new Error(result.error || 'Failed to update region')
      }
    } catch (error) {
      console.error('Error updating region:', error)
      toast({
        title: language === 'zh' ? "更新失败" : "Update Failed",
        description: error instanceof Error ? error.message : 
          (language === 'zh' ? "更新地址时出现错误" : "An error occurred while updating your address"),
        variant: "destructive"
      })
      throw error
    }
  }
  
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

  const defaultPricing: PromoPreviewBreakdown | null = selectedPlan
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

  const handleApplyPromo = async () => {
    if (!selectedPlan) return
    if (paymentMethod !== 'emt') {
      setPromoError(language === 'zh' ? '优惠码仅支持 EMT 付款方式' : 'Promo code only supports EMT payment')
      return
    }
    const code = promoCodeInput.trim().toUpperCase()
    if (!code) {
      setPromoError(language === 'zh' ? '请输入优惠码' : 'Please enter a promo code')
      return
    }

    setIsApplyingPromo(true)
    setPromoError('')
    try {
      const response = await fetch('/api/promo-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId,
          purchaseType: 'weekly_topup',
          paymentMethod: 'emt',
          mealSubtotal: parseFloat((selectedPlan.totalPrice || 0).toFixed(2)),
          deliveryFeeTotal: parseFloat((getDeliveryFee(userRegion || '') * (selectedPlan.duration || 0)).toFixed(2)),
          taxRate: 0.13
        })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to apply promo code')
      }
      setPromoBreakdown(result.data.breakdown)
      setAppliedPromoCode(code)
      setPromoCodeInput(code)
      toast({
        title: language === 'zh' ? '优惠码已应用' : 'Promo code applied',
        description: language === 'zh' ? '折扣将在税前应用。' : 'Discount is applied before tax.'
      })
    } catch (error: any) {
      setAppliedPromoCode(null)
      setPromoBreakdown(null)
      setPromoError(error?.message || (language === 'zh' ? '优惠码无效' : 'Invalid promo code'))
    } finally {
      setIsApplyingPromo(false)
    }
  }

  const handleRemovePromo = () => {
    setPromoBreakdown(null)
    setAppliedPromoCode(null)
    setPromoCodeInput('')
    setPromoError('')
  }
  
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

  useEffect(() => {
    setPromoBreakdown(null)
    setAppliedPromoCode(null)
    setPromoError('')
  }, [selectedPlan?.id, paymentMethod, userRegion])
  
  // Go back to meal count selection
  const handleBackToMealSelect = () => {
    setPurchaseStep('mealSelect')
  }

  // Handle file upload to AWS S3
  const uploadFileToS3 = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to upload file')
    }
    
    return data.url
  }

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

      // Ensure phone is present and saved when promo is used
      const phoneResult = await ensureUserPhone({
        userId,
        phoneInput: phone,
        requirePhone: isPromoUsed,
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
    setAppliedPromoCode(null)
    setPromoBreakdown(null)
    setPromoError('')
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
              return user.address
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
          <motion.div
            key="meal-count-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-medium text-[#6B5F53] text-center mb-4">
              {language === 'zh' ? '请选择每周餐数' : 'Please select meals per week'}
            </h3>
            
            {/* Meals per week selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card 
                className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                onClick={() => handleMealCountSelect(6)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">6</h3>
                  <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                </CardContent>
              </Card>
              
              <div className="relative">
                <Card 
                  className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#C2884E] cursor-pointer"
                  onClick={() => handleMealCountSelect(8)}
                >
                  <CardContent className="p-6 text-center">
                    <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">8</h3>
                    <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                  </CardContent>
                </Card>
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="bg-[#C2884E] text-white text-xs px-3 py-1 rounded-full shadow-sm">
                    {language === 'zh' ? '最推荐' : 'Most Recommended'}
                  </span>
                </div>
              </div>
              
              <Card 
                className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                onClick={() => handleMealCountSelect(10)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">10</h3>
                  <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                </CardContent>
              </Card>
              
              <Card 
                className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                onClick={() => handleMealCountSelect(12)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">12</h3>
                  <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                </CardContent>
              </Card>
              
              <Card 
                className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-[#E5D6BC] hover:border-[#C2884E] cursor-pointer"
                onClick={() => handleMealCountSelect(16)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-2xl font-bold text-[#6B5F53] mb-2">16</h3>
                  <p className="text-sm text-[#8A7968]">{language === 'zh' ? '餐/周' : 'meals/week'}</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional information */}
            <div className="text-xs text-[#8A7968] space-y-1 mt-6">
              <p>* {language === 'zh' ? '餐券卡有效期为半年，可转赠亲友，购买后7天内可退款未用部分' : 'Credits valid for 6 months, transferable, unused portion refundable within 7 days of purchase'}</p>
              <p>* {language === 'zh' ? '以上均为税前价格，支付方式：EMT' : 'All prices before tax, payment method: EMT'}</p>
            </div>
          </motion.div>
        ) : purchaseStep === 'planSelect' ? (
          <motion.div
            key="plan-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-[#8A7968] hover:text-[#6B5F53] hover:bg-transparent p-0"
                onClick={handleBackToMealSelect}
              >
                <ChevronLeft className="h-4 w-4" />
                {language === 'zh' ? '返回选择餐数' : 'Back to meal selection'}
              </Button>
              
              <h3 className="text-lg font-medium text-[#6B5F53]">
                {selectedMealsPerWeek} {language === 'zh' ? '餐/周' : 'meals/week'}
              </h3>
            </div>
            
            {/* Plan options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl flex flex-col ${
                    plan.isPopular || plan.isRecommended ? 'border-[#C2884E]' : 'border-[#E5D6BC]'
                  }`}
                >
                  <div className="relative flex flex-col flex-1">
                    {(plan.isPopular || plan.isRecommended) && (
                      <div className="absolute top-0 right-0 left-0 bg-[#C2884E] text-white text-center py-1.5 text-sm font-medium">
                        {language === 'zh' ? plan.tagZh : plan.tag}
                      </div>
                    )}
                    
                    <CardHeader className={`${(plan.isPopular || plan.isRecommended) ? 'pt-10' : 'pt-6'}`}>
                      <CardTitle className="text-center text-xl text-[#6B5F53]">
                        {language === 'zh' ? plan.durationLabelZh : plan.durationLabel}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 flex-1">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#C2884E]">
                          ${plan.totalPrice}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-[#C2884E]" />
                            <span className="text-sm font-medium text-[#6B5F53]">
                              {language === 'zh' ? '餐数/周' : 'Meals/week'}
                            </span>
                          </div>
                          <span className="font-bold text-[#C2884E]">{plan.mealsPerWeek}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-[#C2884E]" />
                            <span className="text-sm font-medium text-[#6B5F53]">
                              {language === 'zh' ? '单价' : 'Per meal'}
                            </span>
                          </div>
                          <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t border-[#C2884E]/10">
                        {plan.duration !== 1 && (
                          <div className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                            <span className="text-[#6B5F53]">
                              {language === 'zh' ? '非连续使用 | 用1周扣1周' : 'Use Week-by-Week | Pause & Resume Anytime'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                          <span className="text-[#6B5F53]">
                            {language === 'zh' ? '有效期半年' : 'Valid for 6 months'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        onClick={() => handlePlanSelect(plan)}
                        className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 rounded-xl"
                      >
                        {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
                      </Button>
                    </CardFooter>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Delivery fee info */}
            <div className="bg-[#F9F3EC] p-4 rounded-xl border border-[#E5D6BC] text-center">
              <span className="text-[#8A7968]">
                {language === 'zh' ? '配送费/周 (2次配送)' : 'Delivery fee/week (2 deliveries)'}: 
              </span>
              <span className="font-medium text-[#6B5F53] ml-2">${getDeliveryFee(userRegion || '')}</span>
              <span className="text-[#8A7968] ml-1">(Hamilton/Burlington: $15.99)</span>
            </div>
            
            {/* Payment method and tax information - commented out
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
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
        ) : (
          <motion.div
            key="upload-payment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {!isSubmitted ? (
              <>
                {/* Selected plan summary */}
                <div className="bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] p-5 rounded-xl border border-[#C2884E]/10 shadow-sm">
                  <h3 className="font-medium mb-3 text-[#6B5F53] flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#C2884E]" />
                    {language === 'zh' ? '已选套餐' : 'Selected Plan'}
                  </h3>
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Plan details */}
                    <div className="flex justify-between items-center p-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] w-10 h-10 rounded-full flex items-center justify-center text-white">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[#6B5F53]">
                            {language === 'zh' ? selectedPlan?.durationLabelZh : selectedPlan?.durationLabel}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedPlan?.mealsPerWeek} {language === 'zh' ? '餐/周' : 'meals/week'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base text-[#C2884E]">${selectedPlan?.totalPrice}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-2">
                          {appliedPromoCode && discountedUnitPrice ? (
                            <>
                              <span className="line-through opacity-60">
                                ${selectedPlan?.pricePerMeal.toFixed(2)} {language === 'zh' ? '每餐' : '/meal'}
                              </span>
                              <span className="font-semibold text-green-700">
                                ${discountedUnitPrice.toFixed(2)} {language === 'zh' ? '每餐' : '/meal'}
                              </span>
                            </>
                          ) : (
                            <span>
                              ${selectedPlan?.pricePerMeal.toFixed(2)} {language === 'zh' ? '每餐' : '/meal'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Delivery fee */}
                    <div className="px-3 py-2">
                      <div className="flex justify-between items-center">
                        <div className="text-[13px] text-[#8A7968]">
                          {language === 'zh' ? '配送费' : 'Delivery fee'} 
                          <span className="ml-1">
                            (${getDeliveryFee(userRegion || '')} × {selectedPlan?.duration} {language === 'zh' ? '周' : 'weeks'})
                          </span>
                        </div>
                        <div className="text-[13px] text-[#8A7968]">
                          ${(getDeliveryFee(userRegion || '') * (selectedPlan?.duration || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    
                    {effectivePricing && effectivePricing.discountAmount > 0 ? (
                      <div className="px-3 py-2">
                        <div className="flex justify-between items-center">
                          <div className="text-[13px] font-medium text-green-600">
                            {language === 'zh' ? '优惠折扣' : 'Promo Discount'}
                          </div>
                          <div className="font-medium text-green-600">
                            -${effectivePricing.discountAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Tax (HST) */}
                    <div className="px-3 py-2">
                      <div className="flex justify-between items-center">
                        <div className="text-[13px] text-[#8A7968]">
                          {language === 'zh' ? '税费 (HST 13%)' : 'Tax (HST 13%)'}
                        </div>
                        <div className="text-[13px] text-[#8A7968]">
                          ${paymentMethod === 'emt' ? (effectivePricing?.taxAmount.toFixed(2) || '0.00') : '0.00'}
                        </div>
                      </div>
                    </div>
                    
                    {/* WeChat Discount - commented out 
                    <div className="px-3 py-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-green-600">
                          {language === 'zh' ? '微信转账折扣 (10%)' : 'WeChat Payment Discount (10%)'}
                        </div>
                        <div className="font-medium text-green-600">
                          -${(((selectedPlan?.totalPrice || 0) + getDeliveryFee(userRegion || '') * (selectedPlan?.duration || 0)) * 0.1).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    */}
                    
                    {/* Total - with border above */}
                    <div className="mt-2 pt-3 border-t border-[#F5EDE4]">
                      <div className="px-3 py-2">
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-[#6B5F53]">
                            {language === 'zh' ? '总计 (EMT付款)' : 'Total (EMT payment)'}
                          </div>
                          <div className="font-bold text-lg text-[#C2884E]">
                            ${(effectivePricing?.finalTotal ?? parseFloat((baseSubtotal * 1.13).toFixed(2))).toFixed(2)}
                          </div>
                        </div>
                        {/* WeChat payment total - commented out 
                        <div className="flex justify-between items-center mt-1">
                          <div className="font-medium text-[#6B5F53] flex items-center">
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-6 w-6 mr-2" />
                            {language === 'zh' ? '总计 (微信转账)(10%折扣)' : 'Total (WeChat payment)(10% discount)'}
                          </div>
                          <div className="font-bold text-lg text-[#C2884E]">
                            ${(((selectedPlan?.totalPrice || 0) + getDeliveryFee(userRegion || '') * (selectedPlan?.duration || 0)) * 0.9).toFixed(2)}
                          </div>
                        </div>
                        */}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Payment method and tax information - commented out
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="font-medium text-amber-800 mb-2">{language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}</h4>
                  <div className="space-y-2 text-sm text-amber-700">
                    <div className="flex items-start gap-2">
                      <div className="min-w-[20px] mt-0.5">•</div>
                      <p>{language === 'zh' ? '通过EMT电子转账：需额外支付13%税费' : 'Additional 13% tax applies when paying via EMT'}</p>
                    </div>
                  </div>
                </div>
                */}
                
                {/* E-Transfer Information */}
                <div className="space-y-3 mb-6">
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
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-[#6B5F53]">{language === 'zh' ? '金额' : 'Amount'}</p>
                        <p className="font-medium text-[#C2884E]">${(effectivePricing?.finalTotal ?? parseFloat((baseSubtotal * 1.13).toFixed(2))).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promo code (EMT only) */}
                <div className="mb-6 space-y-2">
                  <Label className="text-[#6B5F53] font-medium flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[#C2884E]" />
                    {language === 'zh' ? '优惠码' : 'Promo Code'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder={language === 'zh' ? '输入优惠码' : 'Enter promo code'}
                      disabled={paymentMethod !== 'emt'}
                    />
                    {appliedPromoCode ? (
                      <Button type="button" variant="outline" onClick={handleRemovePromo}>
                        {language === 'zh' ? '移除' : 'Remove'}
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleApplyPromo} disabled={isApplyingPromo || paymentMethod !== 'emt'}>
                        {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'zh' ? '应用' : 'Apply'}
                      </Button>
                    )}
                  </div>
                  {appliedPromoCode ? (
                    <p className="text-xs text-green-700">
                      {language === 'zh' ? '已应用优惠码：' : 'Applied promo code: '}<span className="font-semibold">{appliedPromoCode}</span>
                    </p>
                  ) : null}
                  {promoError ? <p className="text-xs text-red-600">{promoError}</p> : null}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment-proof" className="text-[#6B5F53] font-medium">
                      {language === 'zh' ? '上传付款凭证' : 'Upload Payment Proof'}
                    </Label>
                    <div 
                      className="mt-2 border-2 border-dashed border-[#E5D6BC] rounded-2xl p-6 text-center cursor-pointer hover:border-[#C2884E]/50 transition-colors relative" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="payment-proof"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      
                      {!paymentProof ? (
                        <div className="space-y-2">
                          <div className="mx-auto w-12 h-12 rounded-full bg-[#F9F3EC] flex items-center justify-center">
                            {isLoading ? (
                              <Loader2 className="h-6 w-6 text-[#C2884E] animate-spin" />
                            ) : (
                              <Upload className="h-6 w-6 text-[#C2884E]" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-[#6B5F53]">
                              {language === 'zh' ? '点击上传' : 'Click to upload'}
                            </p>
                            <p className="text-xs text-[#8A7968]">
                              {language === 'zh' ? '上传电子转账付款凭证' : 'Upload e-Transfer payment proof'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <img 
                            src={URL.createObjectURL(paymentProof)} 
                            alt="Payment proof" 
                            className="max-h-[200px] mx-auto rounded-md"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentProof(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Payment method selection */}
                  <div className="mb-6">
                    <Label className="text-[#6B5F53] font-medium mb-2 block">
                      {language === 'zh' ? '选择付款方式' : 'Select Payment Method'}
                    </Label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {/* WeChat payment option - commented out 
                      <div 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === 'wechat' 
                            ? 'border-[#C2884E] bg-[#F9F3EC]' 
                            : 'border-gray-200 hover:border-[#C2884E]/50'
                        }`}
                        onClick={() => setPaymentMethod('wechat')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentMethod === 'wechat' ? 'border-[#C2884E]' : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'wechat' && (
                              <div className="w-3 h-3 rounded-full bg-[#C2884E]" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-6 w-6" />
                            <span className="font-medium">{language === 'zh' ? '微信转账' : 'WeChat Transfer'}</span>
                          </div>
                        </div>
                        <div className="mt-2 ml-8 text-sm text-green-600">
                          {language === 'zh' ? '优惠: 10% 折扣' : 'Discount: 10% off'}
                        </div>
                      </div>
                      */}
                      
                      {/* EMT payment option */}
                      <div 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === 'emt' 
                            ? 'border-[#C2884E] bg-[#F9F3EC]' 
                            : 'border-gray-200 hover:border-[#C2884E]/50'
                        }`}
                        onClick={() => setPaymentMethod('emt')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentMethod === 'emt' ? 'border-[#C2884E]' : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'emt' && (
                              <div className="w-3 h-3 rounded-full bg-[#C2884E]" />
                            )}
                          </div>
                          <span className="font-medium">Interac e-Transfer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  
                  <div>
                    <Label htmlFor="interacEmail" className="text-[#6B5F53] font-medium">
                      {language === 'zh' ? 'INTERAC 电子转账邮箱' : 'INTERAC e-Transfer Email'}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="interacEmail"
                      type="email"
                      value={interacEmail}
                      onChange={(e) => setInteracEmail(e.target.value)}
                      placeholder={language === 'zh' ? '输入您用于发送电子转账的邮箱' : 'Enter the email you used to send the e-Transfer'}
                      className="mt-2"
                      required
                    />
                    <p className="text-xs text-[#8A7968] mt-1">
                      {language === 'zh' ? '我们将使用此邮箱来匹配您的付款和订单。' : "We'll use this to match your payment to your order."}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-[#6B5F53] font-medium">
                      {language === 'zh' ? '手机号码' : 'Phone number'}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={language === 'zh' ? '输入您的手机号' : 'Enter your phone number'}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes" className="text-[#6B5F53] font-medium">
                      {language === 'zh' ? '备注（可选）' : 'Notes (Optional)'}
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={language === 'zh' ? '添加任何额外信息...' : 'Add any additional information...'}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBackToPlans}
                    className="border-[#D1A46C] text-[#8A7968] rounded-xl"
                  >
                    {language === 'zh' ? '返回' : 'Back'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !paymentProof}
                    className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === 'zh' ? '提交中...' : 'Submitting...'}
                      </>
                    ) : (
                      language === 'zh' ? '提交' : 'Submit'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              // Success message
              <div className="py-6">
                <div className="bg-[#F9F3EC] border border-[#D1A46C] rounded-2xl p-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-[#F2E8D9] flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-[#C2884E]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#8A5A34] mb-2">
                    {language === 'zh' ? '谢谢！' : 'Thank You!'}
                  </h3>
                  <p className="text-[#9B6B3F] mb-4">
                    {language === 'zh'
                      ? '您的请求已提交，我们将在营业时间内（周一至周五上午11点至晚上8点）30-60分钟内处理。'
                      : 'Your request has been submitted. We process in 30-60 mins during business hours Monday to Friday 11am to 8pm.'
                    }
                  </p>
                  <div className="border-t border-[#E5D6BC] pt-4 mt-4">
                    <p className="text-sm text-[#9B6B3F]">
                      {language === 'zh'
                        ? '通知邮件可能会进入您的垃圾邮件文件夹，请注意查收。'
                        : 'The notification email may be in your spam folder, please check.'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleBackToPlans}
                    className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 rounded-xl"
                  >
                    {language === 'zh' ? '返回套餐选择' : 'Back to Plans'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

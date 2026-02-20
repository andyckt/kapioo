"use client"

import React, { useState, useRef, useEffect } from 'react'
import heic2any from 'heic2any'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/language-context'
import { DAILY_DELIVERY_AREAS, isDailyDeliveryArea } from '@/lib/constants/areas'
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
  CalendarDays,
  Utensils,
  MessageSquare,
  Ticket
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

interface PromoPreviewBreakdown {
  currency: 'CAD';
  originalSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxRate: number;
  taxAmount: number;
  finalTotal: number;
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
  const [interacEmail, setInteracEmail] = useState('')
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'upload'>('select')
  const router = useRouter()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [showRegionDialog, setShowRegionDialog] = useState(false)
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoBreakdown, setPromoBreakdown] = useState<PromoPreviewBreakdown | null>(null)
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState('')

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

  // Use centralized daily delivery areas
  const DAILY_DELIVERY_REGIONS = DAILY_DELIVERY_AREAS

  const defaultPricing = selectedPlan
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

  const effectivePricing = promoBreakdown || defaultPricing

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

  useEffect(() => {
    setAppliedPromoCode(null)
    setPromoBreakdown(null)
    setPromoError('')
    setCheckoutRequestId('')
  }, [selectedPlan?.id])

  // Handle region change
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

  const createRequestId = () => {
    return `VPR-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  const handleApplyPromo = async () => {
    if (!selectedPlan) return
    const code = promoCodeInput.trim().toUpperCase()
    if (!code) {
      setPromoError(language === 'zh' ? '请输入优惠码' : 'Please enter a promo code')
      return
    }

    const userData = localStorage.getItem('user')
    if (!userData) {
      setPromoError(language === 'zh' ? '请先登录' : 'Please log in first')
      return
    }

    const user = JSON.parse(userData)
    setIsApplyingPromo(true)
    setPromoError('')
    try {
      const response = await fetch('/api/promo-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId: user._id,
          purchaseType: 'daily_topup',
          paymentMethod: 'emt',
          subtotal: selectedPlan.price,
          taxRate: 0.13
        })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to apply promo code')
      }
      setAppliedPromoCode(code)
      setPromoBreakdown(result.data.breakdown)
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
    setAppliedPromoCode(null)
    setPromoBreakdown(null)
    setPromoCodeInput('')
    setPromoError('')
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
      const requestId = checkoutRequestId || createRequestId()
      if (!checkoutRequestId) {
        setCheckoutRequestId(requestId)
      }
      
      // 3. Submit the voucher purchase request
      const response = await fetch('/api/voucher-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user._id,
          requestId,
          type: selectedPlan.type,
          quantity: selectedPlan.quantity,
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
              {language === 'zh' 
                ? '我们将在营业时间内（周一至周五上午11点至晚上8点）30-60分钟内处理您的请求' 
                : 'We process in 30-60 mins during business hours Monday to Friday 11am to 8pm'}
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
                  <p className="font-medium text-[#6B5F53]">${effectivePricing?.originalSubtotal.toFixed(2) || '0.00'}</p>
                </div>
                {effectivePricing && effectivePricing.discountAmount > 0 ? (
                  <div className="flex justify-between items-center border-b border-dashed border-[#C2884E]/10 pb-2">
                    <p className="text-sm text-[#6B5F53]">{language === 'zh' ? '优惠折扣' : 'Promo Discount'}</p>
                    <p className="font-medium text-green-700">-${effectivePricing.discountAmount.toFixed(2)}</p>
                  </div>
                ) : null}
                <div className="flex justify-between items-center border-b border-dashed border-[#C2884E]/10 pb-2">
                  <p className="text-sm text-[#6B5F53]">{language === 'zh' ? '税费 (13%)' : 'Tax (13%)'}</p>
                  <p className="font-medium text-[#6B5F53]">${effectivePricing?.taxAmount.toFixed(2) || '0.00'}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-[#6B5F53]">{language === 'zh' ? '总金额' : 'Total Amount'}</p>
                  <p className="font-bold text-[#C2884E]">${effectivePricing?.finalTotal.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? '优惠码（税前折扣）' : 'Promo Code (applied before tax)'}
            </h3>
            <div className="flex gap-2">
              <Input
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder={language === 'zh' ? '输入优惠码' : 'Enter promo code'}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
              />
              {appliedPromoCode ? (
                <Button type="button" variant="outline" onClick={handleRemovePromo}>
                  {language === 'zh' ? '移除' : 'Remove'}
                </Button>
              ) : (
                <Button type="button" onClick={handleApplyPromo} disabled={isApplyingPromo}>
                  {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'zh' ? '应用' : 'Apply'}
                </Button>
              )}
            </div>
            {appliedPromoCode ? (
              <p className="text-xs text-green-700">
                {language === 'zh' ? '已应用优惠码：' : 'Applied promo code: '}
                <span className="font-semibold">{appliedPromoCode}</span>
              </p>
            ) : null}
            {promoError ? <p className="text-xs text-red-600">{promoError}</p> : null}
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
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 text-[#C2884E] animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6 text-[#C2884E]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#6B5F53]">
                      {language === 'zh' ? '点击上传付款凭证' : 'Click to upload payment proof'}
                    </p>
                  </div>
                </motion.div>
              )}
              <input 
                ref={fileInputRef}
                id="payment-proof" 
                type="file" 
                className="hidden" 
                accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/tiff,image/bmp,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* INTERAC Email Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? 'INTERAC 电子转账邮箱' : 'INTERAC e-Transfer Email'}
              <span className="text-red-500">*</span>
            </h3>
            <Input
              id="interacEmail"
              type="email"
              placeholder={language === 'zh' ? '输入您用于发送电子转账的邮箱' : 'Enter the email you used to send the e-Transfer'}
              value={interacEmail}
              onChange={(e) => setInteracEmail(e.target.value)}
              className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
              required
            />
            <p className="text-xs text-[#8A7968]">
              {language === 'zh' ? '我们将使用此邮箱来匹配您的付款和订单。' : "We'll use this to match your payment to your order."}
            </p>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-[#6B5F53] flex items-center gap-2">
              <Info className="h-4 w-4 text-[#C2884E]" />
              {language === 'zh' ? '备注 (可选)' : 'Notes (Optional)'}
            </h3>
            <Textarea 
              id="notes" 
              placeholder={language === 'zh' ? '添加任何其他相关信息' : 'Add any other relevant information'}
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
                  {language === 'zh' ? '每日直送计划' : 'Daily Delivery Plan'}
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
                  {language === 'zh' ? '每日直送计划详情' : 'Daily Delivery Plan Details'}
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
              
              
              {/* Removed AnimatePresence causing key errors */}
                <TabsContent value="twoDish" className="mt-0">
                  <motion.div
                    key="twoDish-tab-content"
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
                    key="threeDish-tab-content"
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

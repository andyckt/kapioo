"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
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
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CreditPurchasePlansProps {
  userId: string;
  onSuccess?: () => void;
}

// Define plan types
interface PlanOption {
  id: string;
  duration: 1 | 2 | 4;
  durationLabel: string;
  durationLabelZh: string;
  mealsPerWeek: 6 | 10;
  totalPrice: number;
  pricePerMeal: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  tag?: string;
  tagZh?: string;
}

export function CreditPurchasePlans({ userId, onSuccess }: CreditPurchasePlansProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selectedMealsPerWeek, setSelectedMealsPerWeek] = useState<6 | 10>(6)
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null)
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'upload'>('select')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  // Define plan options based on the image provided
  const planOptions: PlanOption[] = [
    // 1 week options
    { 
      id: 'week1-6', 
      duration: 1, 
      durationLabel: 'One week credit', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 103, 
      pricePerMeal: 17.16 
    },
    { 
      id: 'week1-10', 
      duration: 1, 
      durationLabel: 'One week credit', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 170, 
      pricePerMeal: 17 
    },
    
    // 2 week options
    { 
      id: 'week2-6', 
      duration: 2, 
      durationLabel: 'Two weeks credit', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 186, 
      pricePerMeal: 15.5,
      isRecommended: true,
      tag: 'First time recommended',
      tagZh: '首次推荐'
    },
    { 
      id: 'week2-10', 
      duration: 2, 
      durationLabel: 'Two weeks credit', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 304, 
      pricePerMeal: 15.2,
      isRecommended: true,
      tag: 'First time recommended',
      tagZh: '首次推荐'
    },
    
    // 4 week options
    { 
      id: 'week4-6', 
      duration: 4, 
      durationLabel: 'Four weeks credit', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 360, 
      pricePerMeal: 15,
      isPopular: true,
      tag: 'Best value',
      tagZh: '最佳优惠'
    },
    { 
      id: 'week4-10', 
      duration: 4, 
      durationLabel: 'Four weeks credit', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 592, 
      pricePerMeal: 14.8,
      isPopular: true,
      tag: 'Best value',
      tagZh: '最佳优惠'
    },
  ]

  // Get filtered plans based on selected meals per week
  const filteredPlans = planOptions.filter(plan => plan.mealsPerWeek === selectedMealsPerWeek)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0])
    }
  }

  // Handle plan selection
  const handlePlanSelect = (plan: PlanOption) => {
    setSelectedPlan(plan)
    setPurchaseStep('upload')
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
    
    if (!selectedPlan || !paymentProof) {
      toast({
        title: language === 'zh' ? '请上传付款凭证' : 'Please upload payment proof',
        description: language === 'zh' ? '请上传您的电子转账付款凭证' : 'Please upload your e-Transfer payment proof',
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      // Upload payment proof to S3
      const imageUrl = await uploadFileToS3(paymentProof)
      
      // Submit request to backend
      const response = await fetch('/api/credits/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount: selectedPlan.totalPrice,
          mealsPerWeek: selectedPlan.mealsPerWeek,
          duration: selectedPlan.duration,
          imageProof: imageUrl,
          notes
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request')
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
        description: language === 'zh' ? '请稍后再试' : 'Please try again later',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when going back to plan selection
  const handleBackToPlans = () => {
    setPurchaseStep('select')
    setSelectedPlan(null)
    setPaymentProof(null)
    setNotes('')
  }

  return (
    <div className="space-y-6">
      {/* Header with info button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#6B5F53]">
          {language === 'zh' ? '周次订阅' : 'Weekly Meal Box'}
        </h2>
        
        <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EDE4] hover:bg-[#F0E5D9] text-[#C2884E] transition-all duration-300 hover:scale-110">
              <Info className="h-4 w-4" />
            </button>
          </DialogTrigger>
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
                    {language === 'zh' ? '$11.99/周 (2次配送)' : '$11.99/week (2 deliveries)'}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <AnimatePresence mode="wait">
        {purchaseStep === 'select' ? (
          <motion.div
            key="plan-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Meals per week selector */}
            <div className="bg-[#F9F3EC] p-4 rounded-xl border border-[#E5D6BC]">
              <h3 className="text-lg font-medium text-[#6B5F53] mb-3">
                {language === 'zh' ? '选择每周餐数' : 'Select meals per week'}
              </h3>
              <div className="flex gap-4">
                <Button
                  onClick={() => setSelectedMealsPerWeek(6)}
                  variant={selectedMealsPerWeek === 6 ? "default" : "outline"}
                  className={`flex-1 rounded-xl ${selectedMealsPerWeek === 6 ? 'bg-[#C2884E] hover:bg-[#B27A40]' : 'border-[#D1A46C] text-[#8A7968]'}`}
                >
                  6 {language === 'zh' ? '餐/周' : 'meals/week'}
                </Button>
                <Button
                  onClick={() => setSelectedMealsPerWeek(10)}
                  variant={selectedMealsPerWeek === 10 ? "default" : "outline"}
                  className={`flex-1 rounded-xl ${selectedMealsPerWeek === 10 ? 'bg-[#C2884E] hover:bg-[#B27A40]' : 'border-[#D1A46C] text-[#8A7968]'}`}
                >
                  10 {language === 'zh' ? '餐/周' : 'meals/week'}
                </Button>
              </div>
            </div>
            
            {/* Plan options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl ${
                    plan.isPopular || plan.isRecommended ? 'border-[#C2884E]' : 'border-[#E5D6BC]'
                  }`}
                >
                  <div className="relative">
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
                    
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#C2884E]">
                          ${plan.totalPrice}
                        </div>
                        <div className="text-sm text-[#8A7968] mt-1">
                          (${plan.pricePerMeal} {language === 'zh' ? '每餐' : 'per meal'})
                        </div>
                      </div>
                      
                      <div className="text-center bg-[#F9F3EC] py-3 px-4 rounded-xl">
                        <div className="text-sm font-medium text-[#6B5F53]">
                          {plan.mealsPerWeek} {language === 'zh' ? '餐 / 周' : 'meals / week'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t border-[#C2884E]/10">
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                          <span className="text-[#6B5F53]">
                            {language === 'zh' ? '可转让' : 'Transferable'}
                          </span>
                        </div>
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
              <span className="font-medium text-[#6B5F53] ml-2">$11.99</span>
            </div>
            
            {/* Additional information */}
            <div className="text-xs text-[#8A7968] space-y-1">
              <p>* {language === 'zh' ? '餐券卡有效期为半年，可转赠亲友，购买后7天内可退款未用部分' : 'Credits valid for 6 months, transferable, unused portion refundable within 7 days of purchase'}</p>
              <p>* {language === 'zh' ? '以上均为税前价格，支付方式：EMT/微信' : 'All prices before tax, payment methods: EMT/WeChat Pay'}</p>
            </div>
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
                <div className="bg-[#F9F3EC] p-4 rounded-xl border border-[#E5D6BC]">
                  <h3 className="text-lg font-medium text-[#6B5F53] mb-3">
                    {language === 'zh' ? '已选套餐' : 'Selected Plan'}
                  </h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-[#6B5F53]">
                        {language === 'zh' ? selectedPlan?.durationLabelZh : selectedPlan?.durationLabel}
                      </div>
                      <div className="text-sm text-[#8A7968]">
                        {selectedPlan?.mealsPerWeek} {language === 'zh' ? '餐/周' : 'meals/week'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#C2884E]">
                        ${selectedPlan?.totalPrice}
                      </div>
                      <div className="text-xs text-[#8A7968]">
                        ${selectedPlan?.pricePerMeal} {language === 'zh' ? '每餐' : 'per meal'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Payment proof upload */}
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
                            <Upload className="h-6 w-6 text-[#C2884E]" />
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
                      ? '您的请求已提交，我们将在15分钟内审核。'
                      : 'Your request has been submitted. We will review it within 15 minutes.'
                    }
                  </p>
                  <div className="border-t border-[#E5D6BC] pt-4 mt-4">
                    <p className="text-sm text-[#9B6B3F]">
                      {language === 'zh'
                        ? '您可以在"购买历史"部分查看请求状态。'
                        : 'You can check the status of your request in the "Purchase History" section.'
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

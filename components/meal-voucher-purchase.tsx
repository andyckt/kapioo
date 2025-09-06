"use client"

import React, { useState, useRef } from 'react'
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
import { 
  CreditCard, 
  Upload, 
  Check, 
  Clock, 
  AlertCircle, 
  Info, 
  MapPin,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'

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

export default function MealVoucherPurchase() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'twoDish' | 'threeDish'>('twoDish')
  const [selectedPlan, setSelectedPlan] = useState<VoucherPlan | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'upload' | 'confirm'>('select')
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Define voucher plans
  const twoDishPlans: VoucherPlan[] = [
    { id: 'two-6', type: 'twoDish', quantity: 6, price: 131, pricePerMeal: 21.83 },
    { id: 'two-10', type: 'twoDish', quantity: 10, price: 195, pricePerMeal: 19.50, isPopular: true, savings: '首次推荐' },
    { id: 'two-22', type: 'twoDish', quantity: 22, price: 356, pricePerMeal: 16.18, savings: '单价16.18' },
    { id: 'two-46', type: 'twoDish', quantity: 46, price: 712, pricePerMeal: 15.48, savings: '限时超值' }
  ]

  const threeDishPlans: VoucherPlan[] = [
    { id: 'three-6', type: 'threeDish', quantity: 6, price: 150, pricePerMeal: 25.00 },
    { id: 'three-10', type: 'threeDish', quantity: 10, price: 228, pricePerMeal: 22.80, isPopular: true, savings: '首次推荐' },
    { id: 'three-22', type: 'threeDish', quantity: 22, price: 417, pricePerMeal: 18.95, savings: '单价18.95' },
    { id: 'three-46', type: 'threeDish', quantity: 46, price: 818, pricePerMeal: 17.78, savings: '限时超值' }
  ]

  // Available service areas
  const serviceAreas = ['Downtown', 'Midtown', 'North York', 'Markham', 'Richmond Hill']

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0])
    }
  }

  // Handle plan selection
  const handlePlanSelect = (plan: VoucherPlan) => {
    setSelectedPlan(plan)
    setPurchaseStep('upload')
  }

  // Handle payment proof upload
  const handleUpload = () => {
    if (!paymentProof) {
      toast({
        title: language === 'zh' ? "请上传付款凭证" : "Please upload payment proof",
        variant: "destructive"
      })
      return
    }

    setPurchaseStep('confirm')
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

    // This is just a placeholder - the actual implementation will be done later
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: language === 'zh' ? "购买请求已提交" : "Purchase request submitted",
        description: language === 'zh' ? "我们将尽快审核您的请求" : "We will review your request as soon as possible"
      })
      
      // Reset form
      setSelectedPlan(null)
      setPaymentProof(null)
      setNotes('')
      setPurchaseStep('select')
    }, 1500)
  }

  // Render the plan cards
  const renderPlanCards = (plans: VoucherPlan[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            className={`relative rounded-lg border overflow-hidden ${
              selectedPlan?.id === plan.id ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-bl-lg">
                {language === 'zh' ? '推荐' : 'Popular'}
              </div>
            )}
            <div className={`bg-[#C2884E] text-primary-foreground p-4`}>
              <h3 className="font-bold text-xl">
                {plan.type === 'twoDish' 
                  ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                  : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
              </h3>
              <div className="mt-1">
                <span className="text-2xl font-bold">${plan.price}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-medium mb-2">
                {plan.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    {language === 'zh' 
                      ? `单价 $${plan.pricePerMeal.toFixed(2)}/餐` 
                      : `$${plan.pricePerMeal.toFixed(2)} per meal`}
                  </span>
                </div>
                {plan.savings && (
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{plan.savings}</span>
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                variant={plan.isPopular ? "default" : "outline"}
                onClick={() => handlePlanSelect(plan)}
              >
                {language === 'zh' ? '选择' : 'Select'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // Render the upload section
  const renderUploadSection = () => {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{language === 'zh' ? '上传付款凭证' : 'Upload Payment Proof'}</CardTitle>
          <CardDescription>
            {language === 'zh' 
              ? '请通过Interac e-Transfer转账后上传付款凭证' 
              : 'Please upload proof of payment after sending Interac e-Transfer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedPlan && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">
                {language === 'zh' ? '已选套餐' : 'Selected Plan'}
              </h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {selectedPlan.type === 'twoDish' 
                      ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                      : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
                  </p>
                </div>
                <p className="text-xl font-bold">${selectedPlan.price}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="e-transfer-info">
              {language === 'zh' ? 'Interac e-Transfer 信息' : 'Interac e-Transfer Information'}
            </Label>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>{language === 'zh' ? '收款人邮箱' : 'Recipient Email'}:</strong> payments@kapioo.com</p>
              <p><strong>{language === 'zh' ? '金额' : 'Amount'}:</strong> ${selectedPlan?.price}</p>
              <p><strong>{language === 'zh' ? '安全问题' : 'Security Question'}:</strong> What is the name of our company?</p>
              <p><strong>{language === 'zh' ? '答案' : 'Answer'}:</strong> kapioo</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-proof">
              {language === 'zh' ? '付款凭证' : 'Payment Proof'}
            </Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                 onClick={() => fileInputRef.current?.click()}>
              {paymentProof ? (
                <div className="space-y-2">
                  <Check className="h-8 w-8 text-green-500 mx-auto" />
                  <p className="font-medium text-green-600">{paymentProof.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' ? '点击更换文件' : 'Click to change file'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="font-medium">
                    {language === 'zh' ? '点击上传付款凭证' : 'Click to upload payment proof'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' ? '支持 PNG, JPG, PDF 格式' : 'PNG, JPG, PDF formats supported'}
                  </p>
                </div>
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

          <div className="space-y-2">
            <Label htmlFor="notes">
              {language === 'zh' ? '备注 (可选)' : 'Notes (Optional)'}
            </Label>
            <Textarea 
              id="notes" 
              placeholder={language === 'zh' ? '添加任何相关信息' : 'Add any relevant information'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setPurchaseStep('select')}>
            {language === 'zh' ? '返回' : 'Back'}
          </Button>
          <Button onClick={handleUpload}>
            {language === 'zh' ? '继续' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render the confirmation section
  const renderConfirmSection = () => {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{language === 'zh' ? '确认购买' : 'Confirm Purchase'}</CardTitle>
          <CardDescription>
            {language === 'zh' 
              ? '请确认您的购买信息' 
              : 'Please confirm your purchase information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {selectedPlan?.type === 'twoDish' 
                    ? (language === 'zh' ? '每餐2菜' : '2-Dish Meal') 
                    : (language === 'zh' ? '每餐3菜' : '3-Dish Meal')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan?.quantity} {language === 'zh' ? '餐券' : 'vouchers'}
                </p>
              </div>
              <p className="text-xl font-bold">${selectedPlan?.price}</p>
            </div>
            
            <div className="pt-2 border-t">
              <p className="font-medium mb-1">
                {language === 'zh' ? '付款凭证' : 'Payment Proof'}
              </p>
              <p className="text-sm text-muted-foreground">
                {paymentProof?.name}
              </p>
            </div>

            {notes && (
              <div className="pt-2 border-t">
                <p className="font-medium mb-1">
                  {language === 'zh' ? '备注' : 'Notes'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notes}
                </p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  {language === 'zh' ? '重要提示' : 'Important Note'}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {language === 'zh' 
                    ? '您的购买请求将在我们确认收到付款后处理。这通常需要1-2个工作日。' 
                    : 'Your purchase request will be processed after we confirm receipt of payment. This typically takes 1-2 business days.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setPurchaseStep('upload')}>
            {language === 'zh' ? '返回' : 'Back'}
          </Button>
          <Button onClick={handleSubmitPurchase} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'zh' ? '提交中...' : 'Submitting...'}
              </>
            ) : (
              language === 'zh' ? '提交购买请求' : 'Submit Purchase Request'
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#C2884E] to-[#D1A46C] bg-clip-text text-transparent">
            {language === 'zh' ? '每日直送餐券' : 'Daily Delivery Meal Plan'}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] rounded-full mt-1"></div>
        </div>
      </div>

      {/* Service Area Information */}
      <div className="flex items-center gap-2 mb-4 bg-muted/50 p-3 rounded-lg">
        <MapPin className="h-5 w-5 text-[#C2884E]" />
        <div>
          <p className="text-sm font-medium">
            {language === 'zh' ? '配送区域' : 'Available Areas'}:
          </p>
          <p className="text-xs text-muted-foreground">
            {serviceAreas.join(', ')}
          </p>
        </div>
      </div>

      {/* Purchase Steps */}
      {purchaseStep === 'select' && (
        <>
          <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as 'twoDish' | 'threeDish')} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-[#F5EDE4]/30">
              <TabsTrigger 
                value="twoDish" 
                className="data-[state=active]:bg-[#F5EDE4] data-[state=active]:text-[#C2884E] font-medium"
              >
                {language === 'zh' ? '每餐2菜' : '2-Dish Meal'}
              </TabsTrigger>
              <TabsTrigger 
                value="threeDish" 
                className="data-[state=active]:bg-[#F5EDE4] data-[state=active]:text-[#C2884E] font-medium"
              >
                {language === 'zh' ? '每餐3菜' : '3-Dish Meal'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="twoDish" className="mt-0">
              {renderPlanCards(twoDishPlans)}
            </TabsContent>
            
            <TabsContent value="threeDish" className="mt-0">
              {renderPlanCards(threeDishPlans)}
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">
              {language === 'zh' ? '购买说明' : 'Purchase Instructions'}
            </h3>
            <ol className="space-y-4 ml-6 list-decimal">
              <li className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '选择您想要购买的餐券套餐。' 
                  : 'Select the meal voucher plan you wish to purchase.'}
              </li>
              <li className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '通过Interac e-Transfer向我们的账户转账。' 
                  : 'Send payment via Interac e-Transfer to our account.'}
              </li>
              <li className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '上传付款凭证（截图或PDF）。' 
                  : 'Upload proof of payment (screenshot or PDF).'}
              </li>
              <li className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '等待我们确认并处理您的购买请求（通常需要1-2个工作日）。' 
                  : 'Wait for confirmation and processing of your purchase request (typically 1-2 business days).'}
              </li>
              <li className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '餐券将添加到您的账户中，您将收到确认电子邮件。' 
                  : 'Vouchers will be added to your account and you will receive a confirmation email.'}
              </li>
            </ol>
          </div>

          <div className="mt-6 bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-[#C2884E] mt-0.5" />
              <div>
                <p className="font-medium text-[#C2884E]">
                  {language === 'zh' ? '餐券有效期' : 'Voucher Validity'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'zh' 
                    ? '所有餐券有效期为自购买之日起一年。餐券可转赠，购买后7天内可申请退款（未使用）。' 
                    : 'All vouchers are valid for one year from the date of purchase. Vouchers are transferable and refundable within 7 days of purchase (if unused).'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {purchaseStep === 'upload' && renderUploadSection()}
      {purchaseStep === 'confirm' && renderConfirmSection()}

      {/* Purchase History Section */}
      {purchaseStep === 'select' && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">
            {language === 'zh' ? '购买历史' : 'Purchase History'}
          </h3>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : purchaseHistory.length > 0 ? (
            <div className="space-y-4">
              {purchaseHistory.map((purchase) => (
                <Card key={purchase.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{purchase.plan}</p>
                        <p className="text-sm text-muted-foreground">{purchase.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${purchase.amount}</p>
                        <Badge 
                          variant={purchase.status === 'approved' ? 'default' : purchase.status === 'pending' ? 'outline' : 'destructive'}
                          className="mt-1"
                        >
                          {purchase.status === 'approved' 
                            ? (language === 'zh' ? '已批准' : 'Approved')
                            : purchase.status === 'pending'
                              ? (language === 'zh' ? '待处理' : 'Pending')
                              : (language === 'zh' ? '已拒绝' : 'Declined')
                          }
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {language === 'zh' ? '暂无购买记录' : 'No purchase history yet'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import type { ChangeEvent, RefObject } from "react"

import { motion } from "framer-motion"
import {
  Check,
  CheckCircle,
  ChevronLeft,
  CreditCard,
  Info,
  Loader2,
  Phone,
  Tag,
  Ticket,
  Upload,
  Utensils,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PricingBreakdown } from "@/lib/promo-code-shared"

import type { VoucherPlanCard } from "./meal-voucher-plan-grid"

type MealVoucherUploadStepProps = {
  appliedPromoCode: string | null
  discountedUnitPrice: number | null
  effectivePricing: PricingBreakdown | null
  fileInputRef: RefObject<HTMLInputElement | null>
  handleApplyPromo: () => void | Promise<void>
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleRemovePromo: () => void
  interacEmail: string
  isApplyingPromo: boolean
  isLoading: boolean
  isSubmitted: boolean
  language: "en" | "zh"
  notes: string
  onBack: () => void
  onInteracEmailChange: (value: string) => void
  onNotesChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onPromoCodeInputChange: (value: string) => void
  onReset: () => void
  onSubmit: () => void | Promise<void>
  paymentProof: File | null
  phone: string
  promoCodeInput: string
  promoError: string | null
  selectedPlan: VoucherPlanCard | null
}

export function MealVoucherUploadStep({
  appliedPromoCode,
  discountedUnitPrice,
  effectivePricing,
  fileInputRef,
  handleApplyPromo,
  handleFileChange,
  handleRemovePromo,
  interacEmail,
  isApplyingPromo,
  isLoading,
  isSubmitted,
  language,
  notes,
  onBack,
  onInteracEmailChange,
  onNotesChange,
  onPhoneChange,
  onPromoCodeInputChange,
  onReset,
  onSubmit,
  paymentProof,
  phone,
  promoCodeInput,
  promoError,
  selectedPlan,
}: MealVoucherUploadStepProps) {
  if (isSubmitted) {
    return (
      <Card className="mx-auto w-full max-w-2xl border-[#C2884E]/10 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="mb-2 text-xl font-medium text-[#6B5F53]">
              {language === "zh" ? "您的购买请求已提交" : "Your purchase request has been submitted"}
            </h3>
            <p className="text-muted-foreground">
              {language === "zh"
                ? "我们将在营业时间内（周一至周五上午11点至晚上8点）30-60分钟内处理您的请求"
                : "We process in 30-60 mins during business hours Monday to Friday 11am to 8pm"}
            </p>
            <p className="mt-2 text-muted-foreground">
              {language === "zh" ? "审核结果将通过电子邮件通知您" : "You will receive an email notification"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {language === "zh"
                ? "通知邮件可能会进入您的垃圾邮件文件夹，请注意查收。"
                : "The notification email may be in your spam folder, please check."}
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
            onClick={onReset}
          >
            {language === "zh" ? "返回" : "Return to Plans"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl border-[#C2884E]/10 shadow-lg">
      <CardHeader className="border-b border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4]">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-full bg-[#C2884E] p-2 text-white">
            <Upload className="h-4 w-4" />
          </div>
          <CardTitle>{language === "zh" ? "上传付款凭证" : "Upload Payment Proof"}</CardTitle>
        </div>
        <CardDescription>
          {language === "zh"
            ? "请通过Interac e-Transfer转账后上传付款凭证"
            : "Please upload proof of payment after sending Interac e-Transfer"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {selectedPlan ? (
          <div className="rounded-xl border border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-[#6B5F53]">
              <Tag className="h-4 w-4 text-[#C2884E]" />
              {language === "zh" ? "已选套餐" : "Selected Plan"}
            </h3>
            <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-[#6B5F53]">
                    {selectedPlan.type === "twoDish"
                      ? language === "zh"
                        ? "每餐2菜"
                        : "2-Dish Meal"
                      : language === "zh"
                        ? "每餐3菜"
                        : "3-Dish Meal"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.quantity} {language === "zh" ? "餐券" : "vouchers"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#C2884E]">${selectedPlan.price}</p>
                <p className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  {appliedPromoCode && discountedUnitPrice ? (
                    <>
                      <span className="opacity-60 line-through">
                        ${selectedPlan.pricePerMeal.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                      </span>
                      <span className="font-semibold text-green-700">
                        ${discountedUnitPrice.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                      </span>
                    </>
                  ) : (
                    <span>
                      ${selectedPlan.pricePerMeal.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <CreditCard className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "Interac e-Transfer 信息" : "Interac e-Transfer Information"}
          </h3>
          <div className="overflow-hidden rounded-xl border border-[#C2884E]/10 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] px-4 py-2 text-sm font-medium text-white">
              {language === "zh" ? "付款详情" : "Payment Details"}
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-dashed border-[#C2884E]/10 pb-2">
                <p className="text-sm text-[#6B5F53]">{language === "zh" ? "收款人邮箱" : "Recipient Email"}</p>
                <p className="font-medium text-[#6B5F53]">kapioomeal@gmail.com</p>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#C2884E]/10 pb-2">
                <p className="text-sm text-[#6B5F53]">{language === "zh" ? "小计" : "Subtotal"}</p>
                <p className="font-medium text-[#6B5F53]">${effectivePricing?.originalSubtotal.toFixed(2) || "0.00"}</p>
              </div>
              {effectivePricing && effectivePricing.discountAmount > 0 ? (
                <div className="flex items-center justify-between border-b border-dashed border-[#C2884E]/10 pb-2">
                  <p className="text-sm text-[#6B5F53]">{language === "zh" ? "优惠折扣" : "Promo Discount"}</p>
                  <p className="font-medium text-green-700">-${effectivePricing.discountAmount.toFixed(2)}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-b border-dashed border-[#C2884E]/10 pb-2">
                <p className="text-sm text-[#6B5F53]">{language === "zh" ? "税费 (13%)" : "Tax (13%)"}</p>
                <p className="font-medium text-[#6B5F53]">${effectivePricing?.taxAmount.toFixed(2) || "0.00"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#6B5F53]">{language === "zh" ? "总金额" : "Total Amount"}</p>
                <p className="font-bold text-[#C2884E]">${effectivePricing?.finalTotal.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <Ticket className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "优惠码" : "Promo Code"}
          </h3>
          <div className="flex gap-2">
            <Input
              value={promoCodeInput}
              onChange={(event) => onPromoCodeInputChange(event.target.value.toUpperCase())}
              placeholder={language === "zh" ? "输入优惠码" : "Enter promo code"}
              className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
            />
            {appliedPromoCode ? (
              <Button type="button" variant="outline" onClick={handleRemovePromo}>
                {language === "zh" ? "移除" : "Remove"}
              </Button>
            ) : (
              <Button type="button" onClick={handleApplyPromo} disabled={isApplyingPromo}>
                {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "zh" ? "应用" : "Apply"}
              </Button>
            )}
          </div>
          {appliedPromoCode ? (
            <p className="text-xs text-green-700">
              {language === "zh" ? "已应用优惠码：" : "Applied promo code: "}
              <span className="font-semibold">{appliedPromoCode}</span>
            </p>
          ) : null}
          {promoError ? <p className="text-xs text-red-600">{promoError}</p> : null}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <Upload className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "上传付款凭证" : "Upload Payment Proof"}
          </h3>
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              paymentProof
                ? "border-green-200 bg-green-50 hover:bg-green-100/70"
                : "border-[#C2884E]/20 hover:border-[#C2884E]/40 hover:bg-[#F5EDE4]/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {paymentProof ? (
              <motion.div
                className="space-y-3"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-white shadow-sm">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-green-700">{paymentProof.name}</p>
                  <p className="mt-1 text-sm text-green-600">
                    {language === "zh" ? "文件已上传" : "File uploaded"}
                  </p>
                  <p className="mt-2 text-xs text-green-500">
                    {language === "zh" ? "点击更换文件" : "Click to change file"}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div className="space-y-3" whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5EDE4] shadow-sm">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#C2884E]" />
                  ) : (
                    <Upload className="h-6 w-6 text-[#C2884E]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[#6B5F53]">
                    {language === "zh" ? "点击上传付款凭证" : "Click to upload payment proof"}
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

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <CreditCard className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "INTERAC 电子转账邮箱" : "INTERAC e-Transfer Email"}
            <span className="text-red-500">*</span>
          </h3>
          <Input
            id="interacEmail"
            type="email"
            placeholder={language === "zh" ? "输入您用于发送电子转账的邮箱" : "Enter the email you used to send the e-Transfer"}
            value={interacEmail}
            onChange={(event) => onInteracEmailChange(event.target.value)}
            className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
            required
          />
          <p className="text-xs text-[#8A7968]">
            {language === "zh" ? "我们将使用此邮箱来匹配您的付款和订单。" : "We'll use this to match your payment to your order."}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <Phone className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "手机号码" : "Phone number"}
            <span className="text-red-500">*</span>
          </h3>
          <Input
            id="phone"
            type="tel"
            placeholder={language === "zh" ? "输入您的手机号" : "Enter your phone number"}
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
          />
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium text-[#6B5F53]">
            <Info className="h-4 w-4 text-[#C2884E]" />
            {language === "zh" ? "备注 (可选)" : "Notes (Optional)"}
          </h3>
          <Textarea
            id="notes"
            placeholder={language === "zh" ? "添加任何其他相关信息" : "Add any other relevant information"}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2]/50 to-[#F5EDE4]/50">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-[#C2884E]/20 text-[#6B5F53] hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {language === "zh" ? "返回" : "Back"}
        </Button>
        <Button
          onClick={onSubmit}
          className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] hover:opacity-90"
          disabled={!paymentProof || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === "zh" ? "提交中..." : "Submitting..."}
            </>
          ) : (
            <>{language === "zh" ? "提交" : "Submit"}</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

"use client"

import type { ChangeEvent, FormEvent, RefObject } from "react"

import { motion } from "framer-motion"
import {
  Check,
  CheckCircle,
  CreditCard,
  Loader2,
  Star,
  Ticket,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { PricingBreakdown } from "@/lib/promo-code-shared"

import type { CreditPlanOption } from "./credit-plan-select-step"

type CreditUploadStepProps = {
  appliedPromoCode: string | null
  baseSubtotal: number
  discountedUnitPrice: number | null
  effectivePricing: PricingBreakdown | null
  fileInputRef: RefObject<HTMLInputElement | null>
  getDeliveryFee: (region: string) => number
  handleApplyPromo: () => void | Promise<void>
  handleBackToPlans: () => void
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleRemovePromo: () => void
  handleSubmit: (event: FormEvent) => void | Promise<void>
  interacEmail: string
  isApplyingPromo: boolean
  isLoading: boolean
  isSubmitted: boolean
  language: "en" | "zh"
  notes: string
  onInteracEmailChange: (value: string) => void
  onNotesChange: (value: string) => void
  onPaymentMethodChange: (value: "wechat" | "emt" | null) => void
  onPhoneChange: (value: string) => void
  onPromoCodeInputChange: (value: string) => void
  onRemovePaymentProof: () => void
  paymentMethod: "wechat" | "emt" | null
  paymentProof: File | null
  paymentProofPreviewUrl: string | null
  phone: string
  promoCodeInput: string
  promoError: string | null
  selectedPlan: CreditPlanOption | null
  userRegion: string
}

export function CreditUploadStep({
  appliedPromoCode,
  baseSubtotal,
  discountedUnitPrice,
  effectivePricing,
  fileInputRef,
  getDeliveryFee,
  handleApplyPromo,
  handleBackToPlans,
  handleFileChange,
  handleRemovePromo,
  handleSubmit,
  interacEmail,
  isApplyingPromo,
  isLoading,
  isSubmitted,
  language,
  notes,
  onInteracEmailChange,
  onNotesChange,
  onPaymentMethodChange,
  onPhoneChange,
  onPromoCodeInputChange,
  onRemovePaymentProof,
  paymentMethod,
  paymentProof,
  paymentProofPreviewUrl,
  phone,
  promoCodeInput,
  promoError,
  selectedPlan,
  userRegion,
}: CreditUploadStepProps) {
  return (
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
          <div className="rounded-xl border border-[#C2884E]/10 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-[#6B5F53]">
              <Star className="h-4 w-4 text-[#C2884E]" />
              {language === "zh" ? "已选套餐" : "Selected Plan"}
            </h3>
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[#6B5F53]">
                      {language === "zh" ? selectedPlan?.durationLabelZh : selectedPlan?.durationLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan?.mealsPerWeek} {language === "zh" ? "餐/周" : "meals/week"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base text-[#C2884E]">${selectedPlan?.totalPrice}</p>
                  <p className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    {appliedPromoCode && discountedUnitPrice ? (
                      <>
                        <span className="opacity-60 line-through">
                          ${selectedPlan?.pricePerMeal.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                        </span>
                        <span className="font-semibold text-green-700">
                          ${discountedUnitPrice.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                        </span>
                      </>
                    ) : (
                      <span>
                        ${selectedPlan?.pricePerMeal.toFixed(2)} {language === "zh" ? "每餐" : "/meal"}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-[#8A7968]">
                    {language === "zh" ? "配送费" : "Delivery fee"}
                    <span className="ml-1">
                      (${getDeliveryFee(userRegion || "")} x {selectedPlan?.duration}{" "}
                      {language === "zh" ? "周" : "weeks"})
                    </span>
                  </div>
                  <div className="text-[13px] text-[#8A7968]">
                    ${(getDeliveryFee(userRegion || "") * (selectedPlan?.duration || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {effectivePricing && effectivePricing.discountAmount > 0 ? (
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-green-600">
                      {language === "zh" ? "优惠折扣" : "Promo Discount"}
                    </div>
                    <div className="font-medium text-green-600">
                      -${effectivePricing.discountAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-[#8A7968]">
                    {language === "zh" ? "税费 (HST 13%)" : "Tax (HST 13%)"}
                  </div>
                  <div className="text-[13px] text-[#8A7968]">
                    ${paymentMethod === "emt" ? effectivePricing?.taxAmount.toFixed(2) || "0.00" : "0.00"}
                  </div>
                </div>
              </div>

              <div className="mt-2 border-t border-[#F5EDE4] pt-3">
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#6B5F53]">
                      {language === "zh" ? "总计 (EMT付款)" : "Total (EMT payment)"}
                    </div>
                    <div className="text-lg font-bold text-[#C2884E]">
                      ${(effectivePricing?.finalTotal ?? parseFloat((baseSubtotal * 1.13).toFixed(2))).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-3">
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#6B5F53]">{language === "zh" ? "金额" : "Amount"}</p>
                  <p className="font-medium text-[#C2884E]">
                    ${(effectivePricing?.finalTotal ?? parseFloat((baseSubtotal * 1.13).toFixed(2))).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <Label className="flex items-center gap-2 font-medium text-[#6B5F53]">
              <Ticket className="h-4 w-4 text-[#C2884E]" />
              {language === "zh" ? "优惠码" : "Promo Code"}
            </Label>
            <div className="flex gap-2">
              <Input
                value={promoCodeInput}
                onChange={(event) => onPromoCodeInputChange(event.target.value.toUpperCase())}
                placeholder={language === "zh" ? "输入优惠码" : "Enter promo code"}
                disabled={paymentMethod !== "emt"}
              />
              {appliedPromoCode ? (
                <Button type="button" variant="outline" onClick={handleRemovePromo}>
                  {language === "zh" ? "移除" : "Remove"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || paymentMethod !== "emt"}
                >
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

          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-proof" className="font-medium text-[#6B5F53]">
                {language === "zh" ? "上传付款凭证" : "Upload Payment Proof"}
              </Label>
              <div
                className="relative mt-2 cursor-pointer rounded-2xl border-2 border-dashed border-[#E5D6BC] p-6 text-center transition-colors hover:border-[#C2884E]/50"
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
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F9F3EC]">
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#C2884E]" />
                      ) : (
                        <Upload className="h-6 w-6 text-[#C2884E]" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#6B5F53]">
                        {language === "zh" ? "点击上传" : "Click to upload"}
                      </p>
                      <p className="text-xs text-[#8A7968]">
                        {language === "zh" ? "上传电子转账付款凭证" : "Upload e-Transfer payment proof"}
                      </p>
                    </div>
                  </div>
                ) : paymentProofPreviewUrl ? (
                  <div className="relative">
                    <img
                      src={paymentProofPreviewUrl}
                      alt="Payment proof"
                      className="mx-auto max-h-[200px] rounded-md"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white shadow-sm transition-colors hover:bg-red-600"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemovePaymentProof()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F9F3EC]">
                      <CheckCircle className="h-6 w-6 text-[#C2884E]" />
                    </div>
                    <p className="text-sm font-medium text-[#6B5F53]">{paymentProof.name}</p>
                    <p className="text-xs text-[#8A7968]">
                      {language === "zh" ? "文件已准备好提交" : "File is ready to submit"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <Label className="mb-2 block font-medium text-[#6B5F53]">
                {language === "zh" ? "选择付款方式" : "Select Payment Method"}
              </Label>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    paymentMethod === "emt"
                      ? "border-[#C2884E] bg-[#F9F3EC]"
                      : "border-gray-200 hover:border-[#C2884E]/50"
                  }`}
                  onClick={() => onPaymentMethodChange("emt")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        paymentMethod === "emt" ? "border-[#C2884E]" : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "emt" ? <div className="h-3 w-3 rounded-full bg-[#C2884E]" /> : null}
                    </div>
                    <span className="font-medium">Interac e-Transfer</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="interacEmail" className="font-medium text-[#6B5F53]">
                {language === "zh" ? "INTERAC 电子转账邮箱" : "INTERAC e-Transfer Email"}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="interacEmail"
                type="email"
                value={interacEmail}
                onChange={(event) => onInteracEmailChange(event.target.value)}
                placeholder={
                  language === "zh"
                    ? "输入您用于发送电子转账的邮箱"
                    : "Enter the email you used to send the e-Transfer"
                }
                className="mt-2"
                required
              />
              <p className="mt-1 text-xs text-[#8A7968]">
                {language === "zh"
                  ? "我们将使用此邮箱来匹配您的付款和订单。"
                  : "We'll use this to match your payment to your order."}
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="font-medium text-[#6B5F53]">
                {language === "zh" ? "手机号码" : "Phone number"}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder={language === "zh" ? "输入您的手机号" : "Enter your phone number"}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="font-medium text-[#6B5F53]">
                {language === "zh" ? "备注（可选）" : "Notes (Optional)"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder={language === "zh" ? "添加任何额外信息..." : "Add any additional information..."}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBackToPlans}
              className="rounded-xl border-[#D1A46C] text-[#8A7968]"
            >
              {language === "zh" ? "返回" : "Back"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !paymentProof}
              className="rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
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
          </div>
        </>
      ) : (
        <div className="py-6">
          <div className="rounded-2xl border border-[#D1A46C] bg-[#F9F3EC] p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2E8D9]">
              <Check className="h-8 w-8 text-[#C2884E]" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[#8A5A34]">
              {language === "zh" ? "谢谢！" : "Thank You!"}
            </h3>
            <p className="mb-4 text-[#9B6B3F]">
              {language === "zh"
                ? "您的请求已提交，我们将在营业时间内（周一至周五上午11点至晚上8点）30-60分钟内处理。"
                : "Your request has been submitted. We process in 30-60 mins during business hours Monday to Friday 11am to 8pm."}
            </p>
            <div className="mt-4 border-t border-[#E5D6BC] pt-4">
              <p className="text-sm text-[#9B6B3F]">
                {language === "zh"
                  ? "通知邮件可能会进入您的垃圾邮件文件夹，请注意查收。"
                  : "The notification email may be in your spam folder, please check."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleBackToPlans}
              className="rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
            >
              {language === "zh" ? "返回套餐选择" : "Back to Plans"}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

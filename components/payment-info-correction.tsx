"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, Pencil } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { InteracPayerEmailPicker } from "@/components/interac-payer-email-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type PaymentCorrectionRequest = {
  requestId: string
  referenceNumber?: string
  customerActionRequired?: boolean
  customerFeedbackReason?: "payer_email_mismatch" | "payment_not_found" | "amount_mismatch" | "other"
  customerFeedbackMessage?: string
}

type Props = {
  request: PaymentCorrectionRequest
  requestKind: "daily" | "weekly"
  language: "en" | "zh"
  onUpdated: () => void | Promise<void>
}

function reasonText(
  reason: PaymentCorrectionRequest["customerFeedbackReason"],
  language: "en" | "zh"
) {
  const messages = {
    payer_email_mismatch: {
      en: "The sender email does not match the Interac deposit we received.",
      zh: "您填写的转账邮箱与我们收到的 Interac 入账记录不一致。",
    },
    payment_not_found: {
      en: "We could not find a completed deposit using the information provided.",
      zh: "我们无法使用您提供的信息找到已完成的入账记录。",
    },
    amount_mismatch: {
      en: "The payment information does not identify one exact deposit.",
      zh: "当前付款信息无法确认唯一的入账记录。",
    },
    other: {
      en: "Please confirm the email that actually sent this e-Transfer.",
      zh: "请确认实际发送这笔 e-Transfer 的邮箱。",
    },
  }
  return messages[reason || "other"][language]
}

export function PaymentInfoCorrection({ request, requestKind, language, onUpdated }: Props) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [payerEmail, setPayerEmail] = useState(request.referenceNumber || "")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPayerEmail(request.referenceNumber || "")
  }, [request.referenceNumber])

  useEffect(() => {
    if (
      request.customerActionRequired &&
      searchParams.get("correctRequest") === request.requestId
    ) {
      setOpen(true)
    }
  }, [request.customerActionRequired, request.requestId, searchParams])

  if (!request.customerActionRequired) return null

  const submit = async () => {
    if (!payerEmail) return
    setBusy(true)
    try {
      const response = await fetch("/api/etransfer/request-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKind,
          requestId: request.requestId,
          payerEmail,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update payment information")
      }
      setOpen(false)
      await onUpdated()
      toast({
        title: language === "zh" ? "付款信息已更新" : "Payment information updated",
        description:
          language === "zh"
            ? "系统会在下一次检查时自动重新核对您的付款。"
            : "The system will automatically check your payment again on the next run.",
      })
    } catch (error) {
      toast({
        title: language === "zh" ? "无法更新付款信息" : "Could not update payment information",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mx-4 mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="flex-1 space-y-2">
            <p className="font-semibold">
              {language === "zh" ? "需要更新付款信息" : "Payment information needs attention"}
            </p>
            <p>{reasonText(request.customerFeedbackReason, language)}</p>
            {request.customerFeedbackMessage ? (
              <p className="rounded bg-white/70 px-3 py-2">
                <strong>{language === "zh" ? "管理员留言：" : "Message: "}</strong>
                {request.customerFeedbackMessage}
              </p>
            ) : null}
            <Button type="button" size="sm" className="gap-2" onClick={() => setOpen(true)}>
              <Pencil className="h-4 w-4" />
              {language === "zh" ? "更正 Interac 转账邮箱" : "Correct Interac sender email"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === "zh" ? "确认付款邮箱" : "Confirm the payment email"}
            </DialogTitle>
            <DialogDescription>
              {language === "zh"
                ? "选择实际发送这笔 e-Transfer 的邮箱。如果邮箱未验证，请先完成验证。"
                : "Select the email that actually sent this e-Transfer. Verify it first if needed."}
            </DialogDescription>
          </DialogHeader>
          <InteracPayerEmailPicker
            language={language}
            value={payerEmail}
            onChange={setPayerEmail}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {language === "zh" ? "取消" : "Cancel"}
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={busy || !payerEmail}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {language === "zh" ? "提交并重新检查" : "Submit and check again"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Mail, ShieldCheck, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type LinkedEmail = {
  id: string
  email: string
  status: "pending" | "verified"
  verifiedAt?: string | null
}

type Props = {
  language: "en" | "zh"
  value?: string
  onChange?: (email: string) => void
  allowRemove?: boolean
  showManageLink?: boolean
  allowManualFallback?: boolean
}

export function InteracPayerEmailPicker({
  language,
  value = "",
  onChange,
  allowRemove = false,
  showManageLink = false,
  allowManualFallback = false,
}: Props) {
  const { toast } = useToast()
  const [emails, setEmails] = useState<LinkedEmail[]>([])
  const [limit, setLimit] = useState(3)
  const [newEmail, setNewEmail] = useState("")
  const [verificationEmail, setVerificationEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const loadEmails = useCallback(async () => {
    try {
      const response = await fetch("/api/etransfer/payer-emails", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load linked emails")
      const nextEmails = (result.data?.emails || []) as LinkedEmail[]
      setEmails(nextEmails)
      setLimit(Number(result.data?.limit || 3))
      if (!nextEmails.some((entry) => entry.status === "verified" && entry.email === valueRef.current)) {
        onChange?.(nextEmails.find((entry) => entry.status === "verified")?.email || "")
      }
    } catch (error) {
      toast({
        title: language === "zh" ? "无法载入转账邮箱" : "Could not load sender emails",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [language, onChange, toast])

  useEffect(() => {
    void loadEmails()
  }, [loadEmails])

  const sendCode = async (email: string) => {
    if (!email.trim()) return
    setBusy(true)
    try {
      const response = await fetch("/api/etransfer/payer-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to send code")
      if (result.data?.email?.status === "verified") {
        onChange?.(result.data.email.email)
      } else {
        setVerificationEmail(result.data?.email?.email || email.trim().toLowerCase())
        setCode("")
      }
      setNewEmail("")
      await loadEmails()
      toast({
        title: result.data?.sent
          ? language === "zh" ? "验证码已发送" : "Verification code sent"
          : language === "zh" ? "邮箱已经验证" : "Email already verified",
      })
    } catch (error) {
      toast({
        title: language === "zh" ? "无法发送验证码" : "Could not send verification code",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    if (!verificationEmail || !/^\d{6}$/.test(code)) return
    setBusy(true)
    try {
      const response = await fetch("/api/etransfer/payer-emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to verify email")
      onChange?.(result.data.email.email)
      setVerificationEmail("")
      setCode("")
      await loadEmails()
      toast({ title: language === "zh" ? "转账邮箱已验证" : "Sender email verified" })
    } catch (error) {
      toast({
        title: language === "zh" ? "验证失败" : "Verification failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const unlink = async (email: string) => {
    setBusy(true)
    try {
      const response = await fetch("/api/etransfer/payer-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to unlink email")
      if (value === email) onChange?.("")
      await loadEmails()
    } catch (error) {
      toast({
        title: language === "zh" ? "无法移除邮箱" : "Could not unlink email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {language === "zh" ? "载入已验证邮箱..." : "Loading verified emails..."}
      </div>
    )
  }

  const verifiedEmails = emails.filter((entry) => entry.status === "verified")
  const pendingEmails = emails.filter((entry) => entry.status === "pending")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 font-medium text-[#6B5F53]">
          <ShieldCheck className="h-4 w-4 text-[#C2884E]" />
          {language === "zh" ? "已验证的 Interac 转账邮箱" : "Verified Interac sender email"}
        </Label>
        {showManageLink ? (
          <Link href="/dashboard?tab=settings" className="text-xs text-[#9B6B3F] underline">
            {language === "zh" ? "管理邮箱" : "Manage emails"}
          </Link>
        ) : null}
      </div>

      {verifiedEmails.length ? (
        <div className="space-y-2">
          {verifiedEmails.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange?.(entry.email)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                  value === entry.email ? "border-[#C2884E] bg-[#FFF6EF]" : "border-gray-200 bg-white"
                )}
              >
                <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{entry.email}</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </button>
              {allowRemove ? (
                <Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => void unlink(entry.email)} aria-label={`Unlink ${entry.email}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          {language === "zh"
            ? "请先验证您用于发送 e-Transfer 的邮箱。未验证的付款只能人工审核。"
            : "Verify the email you use to send e-Transfers. Unverified payments require manual review."}
        </p>
      )}

      {value && !verifiedEmails.some((entry) => entry.email === value) ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {value} · {language === "zh" ? "将提交人工审核" : "Will be sent for manual review"}
        </div>
      ) : null}

      {pendingEmails.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <span>{entry.email} · {language === "zh" ? "等待验证" : "Pending verification"}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setVerificationEmail(entry.email)}>
            {language === "zh" ? "输入验证码" : "Enter code"}
          </Button>
        </div>
      ))}

      {verificationEmail ? (
        <div className="rounded-lg border border-[#E5D6BC] bg-[#FBF7F2] p-3">
          <p className="mb-2 text-xs text-[#6B5F53]">
            {language === "zh" ? `输入发送至 ${verificationEmail} 的六位验证码` : `Enter the six-digit code sent to ${verificationEmail}`}
          </p>
          <div className="flex gap-2">
            <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            <Button type="button" disabled={busy || code.length !== 6} onClick={() => void verifyCode()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "zh" ? "验证" : "Verify"}
            </Button>
          </div>
        </div>
      ) : null}

      {emails.length < limit ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder={language === "zh" ? "添加 Interac 转账邮箱" : "Add an Interac sender email"} />
            <Button type="button" variant="outline" disabled={busy || !newEmail.trim()} onClick={() => void sendCode(newEmail)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "zh" ? "发送验证码" : "Send code"}
            </Button>
          </div>
          {allowManualFallback && newEmail.trim() ? (
            <Button type="button" variant="ghost" className="h-auto px-0 text-xs text-amber-700" onClick={() => onChange?.(newEmail.trim().toLowerCase())}>
              {language === "zh" ? "现在无法验证？使用此邮箱并提交人工审核" : "Cannot verify now? Use this email for manual review"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {language === "zh"
          ? `每个账户最多可验证 ${limit} 个邮箱。付款必须从所选邮箱发送。`
          : `You can verify up to ${limit} emails. Send the payment from the selected email.`}
      </p>
    </div>
  )
}

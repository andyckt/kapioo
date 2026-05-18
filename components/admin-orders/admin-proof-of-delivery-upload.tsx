"use client"

import { Loader2, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import {
  isAllowedPaymentProofFile,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
} from "@/lib/upload/payment-proof"

type AdminProofOfDeliveryUploadProps = {
  orderId: string
  status?: string
  hasProof: boolean
  isUploading: boolean
  onUpload: (orderId: string, file: File, note?: string) => Promise<void>
}

const TERMINAL_STATUSES = new Set(["cancelled", "refunded"])

export function AdminProofOfDeliveryUpload({
  orderId,
  status,
  hasProof,
  isUploading,
  onUpload,
}: AdminProofOfDeliveryUploadProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [note, setNote] = useState("")

  const maxSizeMb = Math.floor(PAYMENT_PROOF_MAX_SIZE_BYTES / (1024 * 1024))
  const isTerminal = status ? TERMINAL_STATUSES.has(status) : false

  if (hasProof) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("adminPodUploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("adminPodUploadAlreadyExists")}</p>
        </CardContent>
      </Card>
    )
  }

  if (isTerminal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("adminPodUploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("adminPodUploadTerminalStatus")}</p>
        </CardContent>
      </Card>
    )
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!isAllowedPaymentProofFile(file, { allowPdf: false })) {
      toast({
        title: t("adminPodUploadInvalidFileTitle"),
        description: t("adminPodUploadInvalidFileDescription"),
        variant: "destructive",
      })
      return
    }

    if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
      toast({
        title: t("adminPodUploadTooLargeTitle"),
        description: t("adminPodUploadTooLargeDescription").replace("{maxMb}", String(maxSizeMb)),
        variant: "destructive",
      })
      return
    }

    try {
      await onUpload(orderId, file, note.trim() || undefined)
      setNote("")
    } catch {
      // Parent hook shows the error toast.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("adminPodUploadTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("adminPodUploadHint")}</p>

        <div className="space-y-2">
          <Label htmlFor={`pod-note-${orderId}`}>{t("adminPodUploadNoteLabel")}</Label>
          <Textarea
            id={`pod-note-${orderId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("adminPodUploadNotePlaceholder")}
            rows={2}
            maxLength={500}
            disabled={isUploading}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {t("adminPodUploadSubmit")}
        </Button>
      </CardContent>
    </Card>
  )
}

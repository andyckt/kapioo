"use client"

import { ImageIcon, Loader2, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { uploadComboImage } from "@/lib/upload/combo-image-client"
import {
  isAllowedPaymentProofFile,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
} from "@/lib/upload/payment-proof"

import type { ComboItem } from "./types"

type ComboImageEditorProps = {
  combo: ComboItem
  onChange: (updates: Pick<ComboItem, "imageUrl" | "imageKey">) => void
}

export function ComboImageEditor({ combo, onChange }: ComboImageEditorProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const displayUrl = localPreviewUrl || combo.imageUrl
  const maxSizeMb = Math.floor(PAYMENT_PROOF_MAX_SIZE_BYTES / (1024 * 1024))

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!isAllowedPaymentProofFile(file, { allowPdf: false })) {
      toast({
        title: "Invalid image",
        description: "Please upload a JPG, PNG, WebP, HEIC, TIFF, or BMP image.",
        variant: "destructive",
      })
      return
    }

    if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
      toast({
        title: "Image too large",
        description: `Please upload an image under ${maxSizeMb}MB.`,
        variant: "destructive",
      })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setLocalPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return previewUrl
    })
    setIsUploading(true)

    try {
      const result = await uploadComboImage(file, combo.comboId || combo.id)
      onChange({
        imageUrl: result.url,
        imageKey: result.key,
      })
      toast({
        title: "Image uploaded",
        description: "Save the combo to publish this photo.",
      })
    } catch (error) {
      setLocalPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl)
        }
        return null
      })
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload combo image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Combo Image</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Use a clear 16:9 food photo under {maxSizeMb}MB.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-dashed bg-muted/20">
        {displayUrl ? (
          <div className="space-y-3 p-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={`${combo.name} combo preview`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none"
                }}
              />
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading...
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => {
                  setLocalPreviewUrl((previousUrl) => {
                    if (previousUrl) {
                      URL.revokeObjectURL(previousUrl)
                    }
                    return null
                  })
                  onChange({ imageUrl: "", imageKey: "" })
                }}
                disabled={isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Upload combo photo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional, shown on the product page and customer menu.
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

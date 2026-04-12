import { convertHeicToJpeg } from "@/lib/heic-conversion"

import {
  isHeicLikeFile,
  validatePaymentProofFile,
} from "./payment-proof"

type PreparePaymentProofFileOptions = {
  allowPdf?: boolean
}

export class PaymentProofClientError extends Error {
  code: "invalid_type" | "too_large" | "conversion_failed" | "upload_failed"

  constructor(
    code: "invalid_type" | "too_large" | "conversion_failed" | "upload_failed",
    message: string
  ) {
    super(message)
    this.code = code
    this.name = "PaymentProofClientError"
  }
}

export async function preparePaymentProofFile(
  file: File,
  options: PreparePaymentProofFileOptions = {}
) {
  const validation = validatePaymentProofFile(file, options)

  if (!validation.ok) {
    if (validation.code === "too_large") {
      throw new PaymentProofClientError(
        "too_large",
        "File size exceeds the payment proof upload limit"
      )
    }

    throw new PaymentProofClientError(
      "invalid_type",
      "Invalid payment proof file type"
    )
  }

  if (!isHeicLikeFile(file)) {
    return file
  }

  try {
    return await convertHeicToJpeg(file, 0.8)
  } catch (error) {
    throw new PaymentProofClientError(
      "conversion_failed",
      error instanceof Error ? error.message : "Failed to convert HEIC image"
    )
  }
}

export async function uploadPaymentProof(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  let result: unknown = null
  try {
    result = await response.json()
  } catch {
    throw new PaymentProofClientError(
      "upload_failed",
      "Upload response was not valid JSON"
    )
  }

  const payload = result as {
    success?: boolean
    error?: string
    url?: string
  }

  if (!response.ok || !payload.success || !payload.url) {
    throw new PaymentProofClientError(
      "upload_failed",
      payload.error || "Failed to upload file"
    )
  }

  return payload.url
}

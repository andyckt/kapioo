export const PAYMENT_PROOF_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/bmp",
] as const

export const PAYMENT_PROOF_DOCUMENT_MIME_TYPES = ["application/pdf"] as const

export const PAYMENT_PROOF_MAX_SIZE_BYTES = 5 * 1024 * 1024

type PaymentProofFileLike = {
  name: string
  type: string
  size: number
}

type ValidatePaymentProofOptions = {
  allowPdf?: boolean
  maxSizeBytes?: number
}

const PAYMENT_PROOF_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "tiff",
  "tif",
  "bmp",
] as const

const PAYMENT_PROOF_DOCUMENT_EXTENSIONS = ["pdf"] as const

function getLowercaseExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

export function isHeicLikeFile(file: Pick<PaymentProofFileLike, "name" | "type">) {
  const extension = getLowercaseExtension(file.name)
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    (file.type === "" && (extension === "heic" || extension === "heif"))
  )
}

export function isAllowedPaymentProofFile(
  file: Pick<PaymentProofFileLike, "name" | "type">,
  options: Pick<ValidatePaymentProofOptions, "allowPdf"> = {}
) {
  const allowPdf = options.allowPdf ?? false

  if (PAYMENT_PROOF_IMAGE_MIME_TYPES.includes(file.type as (typeof PAYMENT_PROOF_IMAGE_MIME_TYPES)[number])) {
    return true
  }

  if (
    allowPdf &&
    PAYMENT_PROOF_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof PAYMENT_PROOF_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    return true
  }

  const extension = getLowercaseExtension(file.name)

  if (PAYMENT_PROOF_IMAGE_EXTENSIONS.includes(extension as (typeof PAYMENT_PROOF_IMAGE_EXTENSIONS)[number])) {
    return true
  }

  if (
    allowPdf &&
    PAYMENT_PROOF_DOCUMENT_EXTENSIONS.includes(
      extension as (typeof PAYMENT_PROOF_DOCUMENT_EXTENSIONS)[number]
    )
  ) {
    return true
  }

  return false
}

export function validatePaymentProofFile(
  file: PaymentProofFileLike,
  options: ValidatePaymentProofOptions = {}
) {
  const maxSizeBytes = options.maxSizeBytes ?? PAYMENT_PROOF_MAX_SIZE_BYTES

  if (!isAllowedPaymentProofFile(file, options)) {
    return {
      ok: false as const,
      code: "invalid_type" as const,
    }
  }

  if (file.size > maxSizeBytes) {
    return {
      ok: false as const,
      code: "too_large" as const,
    }
  }

  return {
    ok: true as const,
  }
}

export function getPaymentProofExtension(file: Pick<PaymentProofFileLike, "name" | "type">) {
  const extension = getLowercaseExtension(file.name)

  if (!file.type || file.type === "") {
    if (extension === "jpg" || extension === "jpeg") {
      return "jpg"
    }
    if (extension === "png") {
      return "png"
    }
    if (extension === "webp") {
      return "webp"
    }
    if (extension === "heic" || extension === "heif") {
      return "jpg"
    }
    if (extension === "tiff" || extension === "tif") {
      return "tiff"
    }
    if (extension === "bmp") {
      return "bmp"
    }
    if (extension === "pdf") {
      return "pdf"
    }
    return "jpg"
  }

  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
  }

  return extensionByMime[file.type] || "jpg"
}

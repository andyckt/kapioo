type ComboImageUploadResponse = {
  success: boolean
  url?: string
  key?: string
  error?: string
  message?: string
}

export async function uploadComboImage(file: File, comboId?: string) {
  const formData = new FormData()
  formData.append("file", file)

  if (comboId) {
    formData.append("comboId", comboId)
  }

  const response = await fetch("/api/admin/combo-image", {
    method: "POST",
    body: formData,
  })

  const result = (await response.json().catch(() => null)) as ComboImageUploadResponse | null

  if (!response.ok || !result?.success || !result.url || !result.key) {
    throw new Error(result?.error || result?.message || "Failed to upload combo image")
  }

  return {
    url: result.url,
    key: result.key,
  }
}

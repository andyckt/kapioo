/**
 * Shared client helper for menu image uploads (daily combos + weekly meal options).
 *
 * Handles file upload via multipart/form-data and returns the public URL + S3 key.
 * Centralizing this avoids duplicating fetch/error-handling per surface.
 */

type MenuImageUploadResponse = {
  success: boolean
  url?: string
  key?: string
  error?: string
  message?: string
}

export type UploadMenuImageParams = {
  /** Endpoint to upload to, e.g. "/api/admin/combo-image" */
  endpoint: string
  /** The image file to upload */
  file: File
  /** Optional identifier so the server can scope the S3 key to the entity */
  identifier?: string
  /**
   * Optional form-data field name for the identifier (default depends on endpoint).
   * Use this when the server expects something other than `comboId`.
   */
  identifierField?: string
}

export async function uploadMenuImage({
  endpoint,
  file,
  identifier,
  identifierField,
}: UploadMenuImageParams): Promise<{ url: string; key: string }> {
  const formData = new FormData()
  formData.append("file", file)

  if (identifier) {
    formData.append(identifierField || "id", identifier)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  })

  const result = (await response.json().catch(() => null)) as MenuImageUploadResponse | null

  if (!response.ok || !result?.success || !result.url || !result.key) {
    throw new Error(result?.error || result?.message || "Failed to upload image")
  }

  return {
    url: result.url,
    key: result.key,
  }
}

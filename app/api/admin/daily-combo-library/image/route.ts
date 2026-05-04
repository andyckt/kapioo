import { NextRequest, NextResponse } from "next/server"

import { errorJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { uploadMenuImageToS3, validateMenuImageFile } from "@/lib/upload/menu-image"

export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return errorJson("No file provided", 400)

    const validation = validateMenuImageFile(file)
    if (!validation.ok) return errorJson(validation.message, 400)

    const { url, key } = await uploadMenuImageToS3({
      file,
      prefix: "daily-combo-library-images",
      identifier: formData.get("dailyComboLibraryId") as string | null,
    })

    return NextResponse.json({
      success: true,
      url,
      key,
      message: "Daily combo library image uploaded successfully",
    })
  } catch (error: unknown) {
    console.error("Error uploading daily combo library image to S3:", error)
    return errorJson("Failed to upload daily combo library image", 500)
  }
}

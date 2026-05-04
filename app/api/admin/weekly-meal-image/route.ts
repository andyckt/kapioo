import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { uploadMenuImageToS3, validateMenuImageFile } from "@/lib/upload/menu-image";

/**
 * Admin-only S3 upload for weekly meal option images.
 * Mirrors /api/admin/combo-image but writes under the `weekly-meal-images/` prefix.
 */
export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorJson("No file provided", 400);
    }

    const validation = validateMenuImageFile(file);
    if (!validation.ok) {
      return errorJson(validation.message, 400);
    }

    const { url, key } = await uploadMenuImageToS3({
      file,
      prefix: "weekly-meal-images",
      identifier: formData.get("optionId") as string | null,
    });

    return NextResponse.json({
      success: true,
      url,
      key,
      message: "Weekly meal image uploaded successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading weekly meal image to S3:", error);
    return errorJson("Failed to upload weekly meal image", 500);
  }
}

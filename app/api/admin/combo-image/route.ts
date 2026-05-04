import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { errorJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { getS3Config } from "@/lib/env";
import {
  getPaymentProofExtension,
  PAYMENT_PROOF_IMAGE_MIME_TYPES,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  validatePaymentProofFile,
} from "@/lib/upload/payment-proof";

function getS3Client() {
  const { accessKeyId, secretAccessKey, region } = getS3Config();

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function sanitizeComboId(comboId: string | null) {
  return (comboId || "unassigned").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "unassigned";
}

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

    const validation = validatePaymentProofFile(file, { allowPdf: false });

    if (!validation.ok && validation.code === "invalid_type") {
      return errorJson(
        `Invalid file type. Only ${PAYMENT_PROOF_IMAGE_MIME_TYPES.join(", ")} files are allowed.`,
        400
      );
    }

    if (!validation.ok && validation.code === "too_large") {
      return errorJson(
        `File size exceeds the ${Math.floor(PAYMENT_PROOF_MAX_SIZE_BYTES / (1024 * 1024))}MB limit`,
        400
      );
    }

    const { bucket, region } = getS3Config();
    const fileExtension = getPaymentProofExtension(file);
    const comboId = sanitizeComboId(formData.get("comboId") as string | null);
    const key = `combo-images/${comboId}/${uuidv4()}.${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return NextResponse.json({
      success: true,
      url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
      key,
      message: "Combo image uploaded successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading combo image to S3:", error);
    return errorJson("Failed to upload combo image", 500);
  }
}

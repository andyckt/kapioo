import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

import { errorJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { getS3Config } from "@/lib/env";
import { getPublicMediaUrl } from "@/lib/upload/menu-image";
import {
  getPaymentProofExtension,
  PAYMENT_PROOF_DOCUMENT_MIME_TYPES,
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

export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { bucket } = getS3Config();
    const s3Client = getS3Client();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorJson("No file provided", 400);
    }

    const validation = validatePaymentProofFile(file, { allowPdf: true });

    if (!validation.ok && validation.code === "invalid_type") {
      return errorJson(
        `Invalid file type. Only ${[
          ...PAYMENT_PROOF_IMAGE_MIME_TYPES,
          ...PAYMENT_PROOF_DOCUMENT_MIME_TYPES,
        ].join(", ")} files are allowed.`,
        400
      );
    }

    if (!validation.ok && validation.code === "too_large") {
      return errorJson(
        `File size exceeds the ${Math.floor(PAYMENT_PROOF_MAX_SIZE_BYTES / (1024 * 1024))}MB limit`,
        400
      );
    }

    const fileExtension = getPaymentProofExtension(file);

    const fileName = `voucher-proofs/${uuidv4()}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadParams = {
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const fileUrl = getPublicMediaUrl(fileName);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      key: fileName,
      message: "File uploaded successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading file to S3:", error);
    return errorJson("Failed to upload file", 500);
  }
}

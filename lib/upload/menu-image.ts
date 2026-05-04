import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

import { getS3Config } from "@/lib/env";
import {
  getPaymentProofExtension,
  PAYMENT_PROOF_IMAGE_MIME_TYPES,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  validatePaymentProofFile,
} from "@/lib/upload/payment-proof";

/**
 * Shared S3 helpers for menu image uploads (daily combos + weekly meal options).
 *
 * Single source of truth so each menu surface uses the same validation rules,
 * key conventions, and S3 lifecycle behavior. Routes still own their auth gates
 * and HTTP shape; only the storage logic is shared here.
 */

export const MENU_IMAGE_ALLOWED_MIME_TYPES = PAYMENT_PROOF_IMAGE_MIME_TYPES;
export const MENU_IMAGE_MAX_SIZE_BYTES = PAYMENT_PROOF_MAX_SIZE_BYTES;

let cachedS3Client: S3Client | null = null;

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }
  const { accessKeyId, secretAccessKey, region } = getS3Config();
  cachedS3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return cachedS3Client;
}

function sanitizeIdentifier(identifier: string | null | undefined) {
  const cleaned = (identifier || "unassigned").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return cleaned || "unassigned";
}

export type MenuImageValidationResult =
  | { ok: true }
  | { ok: false; code: "invalid_type"; message: string }
  | { ok: false; code: "too_large"; message: string };

/**
 * Validates a menu image file (image-only; no PDFs allowed).
 * Returns a discriminated result with a user-facing message on failure.
 */
export function validateMenuImageFile(file: File): MenuImageValidationResult {
  const validation = validatePaymentProofFile(file, { allowPdf: false });

  if (!validation.ok && validation.code === "invalid_type") {
    return {
      ok: false,
      code: "invalid_type",
      message: `Invalid file type. Only ${PAYMENT_PROOF_IMAGE_MIME_TYPES.join(", ")} files are allowed.`,
    };
  }

  if (!validation.ok && validation.code === "too_large") {
    return {
      ok: false,
      code: "too_large",
      message: `File size exceeds the ${Math.floor(PAYMENT_PROOF_MAX_SIZE_BYTES / (1024 * 1024))}MB limit`,
    };
  }

  return { ok: true };
}

/**
 * Uploads a menu image to S3 under `<prefix>/<sanitizedIdentifier>/<uuid>.<ext>`.
 *
 * Returns the public URL + key so callers can persist them on the related
 * combo / meal option document.
 */
export async function uploadMenuImageToS3(params: {
  file: File;
  prefix: string;
  identifier?: string | null;
}): Promise<{ url: string; key: string }> {
  const { file, prefix, identifier } = params;
  const { bucket, region } = getS3Config();
  const fileExtension = getPaymentProofExtension(file);
  const cleanedIdentifier = sanitizeIdentifier(identifier);
  const key = `${prefix}/${cleanedIdentifier}/${uuidv4()}.${fileExtension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return {
    url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    key,
  };
}

/**
 * Best-effort delete of a menu image from S3.
 *
 * Never throws. Used during PUT (replace/remove) and DELETE flows so legacy
 * S3 objects do not pile up. Safe to call with `undefined`/empty key.
 */
export async function deleteMenuImageFromS3(key?: string | null): Promise<void> {
  if (!key || typeof key !== "string") {
    return;
  }
  try {
    const { bucket } = getS3Config();
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.warn("Failed to delete menu image from S3:", error);
  }
}

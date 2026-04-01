import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

import { errorJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { getS3Config } from "@/lib/env";

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

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
  };

  return extensions[mimeType] || "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { bucket, region } = getS3Config();
    const s3Client = getS3Client();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorJson("No file provided", 400);
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/tiff",
      "image/bmp",
      "application/pdf",
    ];

    let isValidType = allowedTypes.includes(file.type);

    if (!isValidType && (!file.type || file.type === "")) {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      isValidType =
        fileExt === "jpg" ||
        fileExt === "jpeg" ||
        fileExt === "png" ||
        fileExt === "webp" ||
        fileExt === "heic" ||
        fileExt === "heif" ||
        fileExt === "tiff" ||
        fileExt === "tif" ||
        fileExt === "bmp" ||
        fileExt === "pdf";
    }

    if (!isValidType) {
      return errorJson(
        "Invalid file type. Only JPEG, PNG, WebP, HEIC, HEIF, TIFF, BMP, and PDF files are allowed.",
        400
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorJson("File size exceeds the 5MB limit", 400);
    }

    let fileExtension: string;
    if (!file.type || file.type === "") {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (fileExt === "jpg" || fileExt === "jpeg") {
        fileExtension = "jpg";
      } else if (fileExt === "png") {
        fileExtension = "png";
      } else if (fileExt === "webp") {
        fileExtension = "webp";
      } else if (fileExt === "heic" || fileExt === "heif") {
        fileExtension = "jpg";
      } else if (fileExt === "tiff" || fileExt === "tif") {
        fileExtension = "tiff";
      } else if (fileExt === "bmp") {
        fileExtension = "bmp";
      } else if (fileExt === "pdf") {
        fileExtension = "pdf";
      } else {
        fileExtension = "jpg";
      }
    } else {
      fileExtension = getFileExtension(file.type);
    }

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

    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

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

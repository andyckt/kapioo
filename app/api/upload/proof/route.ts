import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

import { errorJson, successJson } from "@/lib/api";
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

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { bucket, region } = getS3Config();
    const awsBucketName = bucket;
    const s3Client = getS3Client();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (
      actor.role !== "admin" &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return errorJson("You cannot upload proof for another user", 403);
    }

    if (!file) {
      return errorJson("No file provided", 400);
    }

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/tiff",
      "image/bmp",
    ];
    if (!validTypes.includes(file.type)) {
      return errorJson(
        "Invalid file type. Please upload a valid image format.",
        400
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorJson("File size exceeds 10MB limit", 400);
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `credit-proofs/${userId}/${uuidv4()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    const fileUrl = `https://${awsBucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return successJson({
      url: fileUrl,
      key: fileName,
      fileName,
    });
  } catch (error: unknown) {
    console.error("Error uploading file:", error);
    return errorJson("Failed to upload file", 500);
  }
}

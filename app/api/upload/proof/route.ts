import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

import { getS3Config } from '@/lib/env';
import { requireUser } from '@/lib/auth/guards';

function getS3Client() {
  const { accessKeyId, secretAccessKey, region } = getS3Config();
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
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

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (
      actor.role !== 'admin' &&
      userId &&
      String(userId) !== String(actor.user._id) &&
      String(userId) !== String(actor.user.userID)
    ) {
      return NextResponse.json(
        { success: false, error: 'You cannot upload proof for another user' },
        { status: 403 }
      );
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a valid image format.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `credit-proofs/${userId}/${uuidv4()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type
    });

    await s3Client.send(command);

    // Generate the URL for the uploaded file
    const fileUrl = `https://${awsBucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        key: fileName,
        fileName: fileName
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

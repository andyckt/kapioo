import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function POST(request: Request) {
  try {
    // Check if AWS credentials are configured
    const awsBucketName = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !awsBucketName) {
      console.error('AWS credentials or bucket name not configured');
      console.error('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
      console.error('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
      console.error('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET || 'Not set');
      console.error('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'Not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

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
    const fileUrl = `https://${awsBucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
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

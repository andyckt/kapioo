import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { awsConfig, getS3BucketName } from '@/lib/config';

// Create S3 client
const s3 = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

// POST route for image upload
export async function POST(request: NextRequest) {
  // Get bucket name from config
  const bucketName = getS3BucketName();
  console.log('S3 bucket name:', bucketName);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;

    // Generate a unique filename with original extension
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: fileType,
    };

    console.log('Uploading to S3...', { fileName, fileType });
    
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Create the image URL
    const imageUrl = `https://${bucketName}.s3.${awsConfig.region}.amazonaws.com/${fileName}`;
    
    console.log('Upload successful, image URL:', imageUrl);

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Error uploading image', details: error },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
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
      secretAccessKey,
    }
  });
}

// Helper function to get file extension from mime type
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/tiff': 'tiff',
    'image/bmp': 'bmp',
    'application/pdf': 'pdf'
  };
  
  return extensions[mimeType] || 'jpg'; // Default to jpg for converted files
}

// POST handler for file uploads
export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const { bucket, region } = getS3Config();
    const s3Client = getS3Client();

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp', 'application/pdf'];
    
    // For files with no recognized type, check the file extension
    let isValidType = allowedTypes.includes(file.type);
    
    if (!isValidType && (!file.type || file.type === '')) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      isValidType = fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png' || fileExt === 'webp' || 
                  fileExt === 'heic' || fileExt === 'heif' || fileExt === 'tiff' || fileExt === 'tif' || 
                  fileExt === 'bmp' || fileExt === 'pdf';
    }
    
    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, HEIC, HEIF, TIFF, BMP, and PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the 5MB limit' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    let fileExtension;
    if (!file.type || file.type === '') {
      // If file type is empty, try to get extension from filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt === 'jpg' || fileExt === 'jpeg') {
        fileExtension = 'jpg';
      } else if (fileExt === 'png') {
        fileExtension = 'png';
      } else if (fileExt === 'webp') {
        fileExtension = 'webp';
      } else if (fileExt === 'heic' || fileExt === 'heif') {
        fileExtension = 'jpg'; // Convert HEIC/HEIF to JPG
      } else if (fileExt === 'tiff' || fileExt === 'tif') {
        fileExtension = 'tiff';
      } else if (fileExt === 'bmp') {
        fileExtension = 'bmp';
      } else if (fileExt === 'pdf') {
        fileExtension = 'pdf';
      } else {
        fileExtension = 'jpg'; // Default to jpg
      }
    } else {
      fileExtension = getFileExtension(file.type);
    }
    
    const fileName = `voucher-proofs/${uuidv4()}.${fileExtension}`;
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const uploadParams = {
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate the URL for the uploaded file
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      key: fileName,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
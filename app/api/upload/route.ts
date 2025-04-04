import { NextRequest } from 'next/server';
import { S3Client, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { successResponseApp as successResponse, errorResponseApp as errorResponse } from '@/lib/api-utils';

// Configure S3 client with more detailed logging
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// For debugging
console.log('S3 Configuration:', {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  // Don't log full credentials, just check if they exist
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

// Simulate image upload functionality
// In a real app, this would upload to a service like AWS S3, Cloudinary, etc.
export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('No file provided in request');
      return errorResponse('No file provided', 400);
    }
    
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    if (!file.type.startsWith('image/')) {
      console.log('File is not an image:', file.type);
      return errorResponse('File must be an image', 400);
    }
    
    // Check if AWS credentials are properly set
    console.log('AWS credentials check:', {
      hasRegion: !!process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET
    });
    
    // Get file as array buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Create unique filename
    const fileName = `meals/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    console.log('Preparing to upload file:', fileName);
    
    try {
      // Upload to S3
      console.log('Sending to S3...');
      
      // Don't use ACL at all since it's causing issues
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET || 'meal-subscription-andy-photos',
        Key: fileName,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
        // No ACL parameter - this works with default bucket settings
      };
      
      console.log('Upload params:', { ...uploadParams, Body: '[Buffer]' });
      
      try {
        const uploadCommand = new PutObjectCommand(uploadParams);
        const uploadResult = await s3Client.send(uploadCommand);
        console.log('S3 upload successful:', uploadResult);
        
        // Construct the URL to the uploaded file
        const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        console.log('Generated image URL:', imageUrl);
        
        return successResponse({
          url: imageUrl,
          originalName: file.name,
          size: file.size
        });
      } catch (uploadError: any) {
        console.error('S3 upload error details:', {
          message: uploadError.message,
          name: uploadError.name,
          code: uploadError.$metadata?.httpStatusCode
        });
        
        // Log all available error details for debugging
        console.error('Full error:', JSON.stringify(uploadError, null, 2));
        
        // Re-throw to use fallback
        throw uploadError;
      }
    } catch (s3Error: any) {
      // If AWS upload fails, use fallback and log error
      console.error('S3 upload error:', s3Error);
      console.log('Using fallback local image URL');
      
      // Use a fallback URL with existing images in the public folder
      // This ensures the app works even if S3 upload fails
      const fallbackImages = [
        '/foodjpg/anh-nguyen-kcA-c3f_3FE-unsplash.jpg',
        '/foodjpg/charlesdeluvio-wrfO9SWykdE-unsplash.jpg',
        '/foodjpg/eiliv-aceron-w0JzqJZYX_E-unsplash.jpg',
        '/foodjpg/haryo-setyadi-yvzzemH8-J0-unsplash.jpg',
        '/foodjpg/kenny-eliason-SDprf7W3NUc-unsplash.jpg',
        '/foodjpg/max-griss-otLqpb9LK70-unsplash.jpg',
        '/foodjpg/omkar-jadhav-o5XB6XwTb1I-unsplash.jpg'
      ];
      
      // Pick a random image from the fallback list
      const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
      
      return successResponse({
        url: randomImage,
        originalName: file.name,
        size: file.size,
        fallback: true,
        message: 'Using fallback image due to S3 upload issue: ' + s3Error.message
      });
    }
  } catch (error: any) {
    console.error('General error in upload API:', error);
    return errorResponse(`Failed to upload file: ${error.message}`, 500);
  }
} 
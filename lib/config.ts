// Configuration variables for the application
// This file helps ensure all required environment variables are present

// List of required environment variables
export const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'EMAIL_USER',
  'EMAIL_PASS',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_BASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  // Either AWS_S3_BUCKET or AWS_S3_BUCKET_NAME is required
];

// Function to validate that all required environment variables are present
export function validateEnvVars() {
  const missingVars = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  // Special check for bucket name - either AWS_S3_BUCKET or AWS_S3_BUCKET_NAME must be present
  const hasBucketVar = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!hasBucketVar && !missingVars.includes('AWS_S3_BUCKET') && !missingVars.includes('AWS_S3_BUCKET_NAME')) {
    missingVars.push('AWS_S3_BUCKET or AWS_S3_BUCKET_NAME');
  }

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  return true;
}

// Function to get environment variables with fallbacks
export function getEnvVar(name: string, fallback: string = ''): string {
  return process.env[name] || fallback;
}

// Get S3 bucket name with support for both environment variable names
export function getS3BucketName(): string {
  return process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'meal-subscription-andy-photos';
}

// MongoDB connection details
export const dbConnectionConfig = {
  uri: process.env.MONGODB_URI || '',
  dbName: 'kapioo',
};

// Email configuration
export const emailConfig = {
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
};

// AWS configuration
export const awsConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  s3Bucket: getS3BucketName(),
};

// Export environment variables with proper typing
export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || ''
  },
  email: {
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASS || '',
    adminEmail: process.env.ADMIN_EMAIL || ''
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || '',
    s3BucketName: process.env.AWS_S3_BUCKET_NAME || ''
  },
  app: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }
};

// Only validate in server environment and not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development') {
  validateEnvVars();
} 
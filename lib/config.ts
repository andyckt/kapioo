// Configuration variables for the application
// This file helps ensure all required environment variables are present

const requiredEnvVars = [
  'MONGODB_URI',
  'EMAIL_USER',
  'EMAIL_PASS',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_BASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME'
];

// Check for missing environment variables during build/startup
export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (envVar) => !(envVar in process.env)
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return true;
}

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
  validateEnv();
} 
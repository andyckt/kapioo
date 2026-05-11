// Configuration variables for the application
// This file helps ensure all required environment variables are present

const requiredEnvVars = [
  'MONGODB_URI',
  'AUTH_SECRET',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_BASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
];
// Check for missing environment variables during build/startup
export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
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
  auth: {
    secret: process.env.AUTH_SECRET || ''
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    adminEmail: process.env.ADMIN_EMAIL || ''
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || '',
    s3BucketName: process.env.AWS_S3_BUCKET || '',
    cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
  },
  app: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }
};

// Only validate in server environment and not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development') {
  validateEnv();
} 
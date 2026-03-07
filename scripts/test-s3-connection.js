// Test script for AWS S3 connection
require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

console.log('Checking S3 environment configuration...');
const configuredAwsVars = [
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  process.env.AWS_REGION,
  process.env.AWS_S3_BUCKET,
].filter(Boolean).length;
console.log(`Configured AWS S3 variables: ${configuredAwsVars}/4`);

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Test connection by listing buckets
async function testConnection() {
  try {
    console.log('Testing S3 connection...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('Connection successful!');
    console.log('Available buckets:');
    if (response.Buckets && response.Buckets.length > 0) {
      response.Buckets.forEach(bucket => {
        console.log(`- ${bucket.Name}`);
      });
      
      // Check if our target bucket exists
      const targetBucket = process.env.AWS_S3_BUCKET;
      const bucketExists = response.Buckets.some(bucket => bucket.Name === targetBucket);
      
      if (bucketExists) {
        console.log(`✅ Target bucket "${targetBucket}" exists and is accessible.`);
      } else {
        console.log(`❌ Target bucket "${targetBucket}" was not found in the list of accessible buckets.`);
      }
    } else {
      console.log('No buckets found in this account.');
    }
    
  } catch (error) {
    console.error('Error connecting to S3:');
    console.error(error);
  }
}

// Run the test
testConnection().catch(err => {
  console.error('Unhandled error in test script:', err);
});
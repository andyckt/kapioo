# Deployment Checklist for Kapioo

Use this checklist before deploying to Vercel.

## Database Setup
- [ ] MongoDB Atlas cluster is set up
- [ ] Network access allows connections from anywhere (0.0.0.0/0) or from Vercel's IP range
- [ ] Database user has correct permissions
- [ ] Connection string is ready for environment variables
- [ ] Test connection from local environment

## AWS S3 Configuration
- [ ] S3 bucket exists and is properly configured
- [ ] IAM user with access keys is created
- [ ] IAM user has correct permissions (S3 access)
- [ ] CORS is configured according to s3-cors-config.json
- [ ] Bucket policy allows public read access for meal images

## Environment Variables 
- [ ] MONGODB_URI is set
- [ ] EMAIL_USER is set
- [ ] EMAIL_PASS is set
- [ ] ADMIN_EMAIL is set
- [ ] NEXT_PUBLIC_BASE_URL is set (should match your domain)
- [ ] AWS_ACCESS_KEY_ID is set
- [ ] AWS_SECRET_ACCESS_KEY is set
- [ ] AWS_REGION is set
- [ ] AWS_S3_BUCKET_NAME is set

## Application Testing
- [ ] Application builds successfully locally
- [ ] API routes work correctly
- [ ] User authentication works
- [ ] Order placement works
- [ ] Admin dashboard is accessible
- [ ] Emails are sending correctly
- [ ] Images load properly from S3 bucket

## Domain Setup
- [ ] Domain is registered and accessible
- [ ] Have access to DNS settings
- [ ] SSL certificate is ready for configuration (Vercel handles this automatically)

## Post-Deployment Verification
- [ ] Application loads correctly on Vercel preview URL
- [ ] Domain is correctly connected to Vercel
- [ ] SSL is working (site loads with https://)
- [ ] All API endpoints are functioning
- [ ] User registration works
- [ ] Emails are sending from production environment
- [ ] Admin dashboard is accessible
- [ ] Orders can be placed and processed
- [ ] Images and assets load correctly 
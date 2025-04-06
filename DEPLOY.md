# Kapioo Meal Subscription - Deployment Guide

This guide provides instructions for deploying the Kapioo Meal Subscription application to Vercel and connecting a custom domain.

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database
- An [AWS account](https://aws.amazon.com) with S3 bucket configured
- Your custom domain

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository is pushed to GitHub, GitLab, or Bitbucket.

### 2. Import Project in Vercel

1. Log in to your Vercel account
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Select the "Next.js" framework preset

### 3. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

#### Required Variables:
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/kapioo?retryWrites=true&w=majority
EMAIL_USER=kapioomeal@gmail.com
EMAIL_PASS=your-email-password-or-app-password
ADMIN_EMAIL=kapioomeal@gmail.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com (or Vercel preview URL for testing)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=meal-subscription-andy-photos
```

### 4. Deploy Your Application

1. Click "Deploy" in the Vercel project setup
2. Wait for the build and deployment to complete
3. Vercel will provide you with a preview URL (e.g., https://your-project.vercel.app)

### 5. Connect Your Custom Domain

1. In your Vercel project, go to "Settings" → "Domains"
2. Add your custom domain (e.g., kapioo.com)
3. Follow one of these methods to verify domain ownership:

#### Method 1: Using Nameservers (Recommended)
Configure your domain to use Vercel's nameservers. This gives Vercel complete control over DNS.

#### Method 2: Using DNS Records
Add the required verification records to your domain's DNS settings:
- A `CNAME` record pointing to `cname.vercel-dns.com`
- An `A` record pointing to Vercel's IP addresses

### 6. SSL Certificate

Vercel automatically provides and renews SSL certificates for your domain.

### 7. Verify Deployment

1. Visit your custom domain to ensure the application is working correctly
2. Test critical flows like:
   - User registration and login
   - Meal selection
   - Order placement
   - Admin dashboard

## Troubleshooting

### Deployment Failed
- Check build logs in Vercel for specific errors
- Ensure all environment variables are correctly set
- Verify your MongoDB connection string is correct and the database is accessible

### Domain Connection Issues
- Make sure DNS changes have propagated (can take up to 48 hours)
- Verify the DNS records match Vercel's requirements
- Check for typos in domain names or DNS records

### API or Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Vercel's IPs or is set to allow access from anywhere (0.0.0.0/0)
- Check that environment variables are correctly set in Vercel
- Ensure AWS S3 bucket has proper CORS configuration

## Maintenance

### Updating Your Application
Push changes to your repository. Vercel will automatically rebuild and deploy your application.

### Monitoring
Set up monitoring through Vercel integrations or external services like Sentry or LogRocket.

### Database Backups
Configure automated backups for your MongoDB Atlas database to prevent data loss. 
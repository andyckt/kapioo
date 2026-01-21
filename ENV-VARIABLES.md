# Environment Variables Reference

## Required Variables

### Email Service (Resend)
```bash
RESEND_API_KEY=re_your_api_key_here
```
Get your API key from [resend.com](https://resend.com) after signing up.

### Admin Configuration
```bash
ADMIN_EMAIL=admin@kapioo.com
```
Email address where admin notifications will be sent.

### Application URLs
```bash
NEXT_PUBLIC_BASE_URL=https://kapioo.com
```
Base URL of your application (used in email links).

### Database
```bash
MONGODB_URI=your_mongodb_connection_string
```
MongoDB connection string.

### AWS S3 (Image Uploads)
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=your_bucket_name
```

### Authentication (NextAuth)
```bash
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://kapioo.com
```

## Deprecated Variables (No Longer Used)

These variables were used with Gmail SMTP but are no longer needed with Resend:

```bash
# ❌ No longer needed
# EMAIL_USER=kapioomeal@gmail.com
# EMAIL_PASS=your_gmail_app_password
```

## Setup Instructions

See [RESEND-SETUP-GUIDE.md](./RESEND-SETUP-GUIDE.md) for detailed setup instructions.

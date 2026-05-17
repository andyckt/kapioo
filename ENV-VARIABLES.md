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
AWS_CLOUDFRONT_DOMAIN=img.kapioo.com
```

`AWS_CLOUDFRONT_DOMAIN` is optional. When set, all uploaded media URLs will use the CloudFront CDN domain (e.g., `https://img.kapioo.com/...`) instead of direct S3 URLs.

### Route Optimizer POD Ingest
```bash
ROUTE_OPTIMIZER_INGEST_TOKEN=your_long_random_bearer_token
ROUTE_OPTIMIZER_INGEST_SECRET=your_long_random_hmac_secret
POD_IMAGE_HOST_ALLOWLIST=r2.kapioo.com,img.kapioo.com
POD_NOTIFY_CUSTOMER=false
```

`ROUTE_OPTIMIZER_INGEST_TOKEN` and `ROUTE_OPTIMIZER_INGEST_SECRET` secure the POD webhook. `POD_IMAGE_HOST_ALLOWLIST` must include the Route Optimizer's R2/CDN image host. `POD_NOTIFY_CUSTOMER` is disabled by default; set it to `true` only if delivered-status emails should be sent after a POD is saved.

For manual testing, create a payload JSON file and run:

```bash
ROUTE_OPTIMIZER_INGEST_TOKEN=xxx ROUTE_OPTIMIZER_INGEST_SECRET=yyy \
node scripts/sign-pod-request.js ./payload.json http://localhost:3000
```

Run the printed `curl` command. The HMAC signs the exact file bytes, so keep `--data-binary @payload.json`.

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

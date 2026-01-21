# Resend Email Service Setup Guide

## Overview

This application now uses **Resend** as the email service provider for all system emails. Resend provides excellent deliverability, especially to strict email providers like Outlook.com, Hotmail, and others.

## Why Resend?

- ✅ **Better Deliverability**: Professional email authentication (SPF, DKIM, DMARC) built-in
- ✅ **Simple Setup**: Just one API key needed
- ✅ **Developer-Friendly**: Clean API, excellent documentation
- ✅ **Free Tier**: 3,000 emails/month free, then $20/month for 50,000 emails
- ✅ **Real-time Tracking**: Beautiful dashboard to monitor email delivery
- ✅ **Next.js Optimized**: Built specifically for modern React/Next.js apps

## Quick Setup (5 Minutes)

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Kapioo Production")
5. Copy the API key (starts with `re_...`)

### Step 3: Add Domain (Recommended for Production)

For production, you should verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `kapioo.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-10 minutes)

**Note**: For testing, you can skip this step and use Resend's default sending domain.

### Step 4: Configure Environment Variables

Add the following to your `.env.local` file (for development) and Vercel environment variables (for production):

```bash
# Resend API Key (Required)
RESEND_API_KEY=re_your_api_key_here

# Admin email for notifications
ADMIN_EMAIL=admin@kapioo.com

# Base URL for email links
NEXT_PUBLIC_BASE_URL=https://kapioo.com
```

### Step 5: Update Email "From" Address (After Domain Verification)

Once your domain is verified, update the `from` address in `lib/services/resend-email.ts`:

```typescript
from: options.from || 'Kapioo <noreply@kapioo.com>',
```

Replace `noreply@kapioo.com` with your verified email address.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | ✅ Yes | Your Resend API key | `re_123abc...` |
| `ADMIN_EMAIL` | ✅ Yes | Admin email for notifications | `admin@kapioo.com` |
| `NEXT_PUBLIC_BASE_URL` | ✅ Yes | Base URL for email links | `https://kapioo.com` |

## Vercel Deployment

To add environment variables to Vercel:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key
   - Environment: Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your application

## Testing Email Delivery

### Test 1: Send Verification Email

```bash
# Run this in your terminal
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "name": "Test User",
    "code": "123456",
    "language": "en"
  }'
```

### Test 2: Check Resend Dashboard

1. Log in to [resend.com](https://resend.com)
2. Go to **Emails** section
3. You should see your test email with delivery status
4. Click on it to see detailed logs

### Test 3: Check Spam Folder

If you don't see the email in your inbox:
1. Check your spam/junk folder
2. Mark it as "Not Spam"
3. This helps train email filters

## Email Types Sent by Resend

All system emails now use Resend:

### Authentication Emails
- ✉️ Verification code emails (signup)
- ✉️ Password reset emails
- ✉️ Welcome emails

### Order Emails
- ✉️ Weekly order confirmations
- ✉️ Daily delivery order confirmations

### Admin Notifications
- ✉️ New credit purchase requests
- ✉️ New voucher purchase requests
- ✉️ New weekly orders
- ✉️ New daily orders

### User Notifications
- ✉️ Credit purchase status updates
- ✉️ Voucher purchase status updates
- ✉️ Menu update notifications

## Troubleshooting

### Error: "RESEND_API_KEY is not set"

**Solution**: Make sure you've added `RESEND_API_KEY` to your environment variables and restarted your development server.

```bash
# Stop the server (Ctrl+C)
# Add RESEND_API_KEY to .env.local
# Restart the server
npm run dev
```

### Error: "Domain not verified"

**Solution**: 
- For development/testing: Use Resend's default domain (no action needed)
- For production: Verify your domain in Resend dashboard

### Emails Going to Spam

**Solution**:
1. Verify your domain in Resend (adds SPF, DKIM, DMARC)
2. Warm up your domain by sending gradually increasing volumes
3. Ask recipients to mark emails as "Not Spam"
4. Check email content for spam triggers (excessive caps, too many links)

### Rate Limiting

**Free Tier Limits**:
- 3,000 emails/month
- 100 emails/day

If you exceed these, upgrade to a paid plan ($20/month for 50,000 emails).

## Monitoring & Analytics

### Resend Dashboard

The Resend dashboard provides:
- 📊 Real-time delivery status
- 📈 Open rates and click rates
- 🔍 Detailed logs for each email
- ⚠️ Bounce and complaint tracking
- 📉 Delivery analytics

### Webhook Integration (Optional)

You can set up webhooks to receive real-time notifications about email events:

1. In Resend dashboard, go to **Webhooks**
2. Add your webhook URL: `https://kapioo.com/api/webhooks/resend`
3. Select events to track (delivered, opened, clicked, bounced, etc.)

## Cost Estimate

Based on typical usage for Kapioo:

| Monthly Emails | Cost | Plan |
|----------------|------|------|
| 0 - 3,000 | $0 | Free |
| 3,001 - 50,000 | $20 | Pro |
| 50,001 - 100,000 | $80 | Business |

**Estimated Usage**:
- 100 new signups/month: 100 emails
- 500 orders/month: 1,000 emails (user + admin)
- 50 credit requests/month: 100 emails
- Menu updates: 200 emails/month
- **Total**: ~1,400 emails/month (well within free tier!)

## Migration from Gmail SMTP

### What Changed

**Before (Gmail SMTP)**:
```typescript
// Used nodemailer with Gmail credentials
EMAIL_USER=kapioomeal@gmail.com
EMAIL_PASS=your_app_password
```

**After (Resend)**:
```typescript
// Uses Resend API
RESEND_API_KEY=re_your_api_key_here
```

### Old Environment Variables (No Longer Needed)

You can remove these from your environment variables:
- ❌ `EMAIL_USER`
- ❌ `EMAIL_PASS`

**Note**: Keep them temporarily during testing, then remove once Resend is confirmed working.

## Support

### Resend Support
- Documentation: [resend.com/docs](https://resend.com/docs)
- Email: support@resend.com
- Discord: [resend.com/discord](https://resend.com/discord)

### Kapioo Internal
- Check logs in Vercel dashboard
- Check Resend dashboard for email delivery status
- Contact development team for code-related issues

## Next Steps

1. ✅ Sign up for Resend account
2. ✅ Get API key
3. ✅ Add `RESEND_API_KEY` to environment variables
4. ✅ Test email sending
5. ✅ Verify domain (for production)
6. ✅ Monitor Resend dashboard
7. ✅ Remove old Gmail SMTP credentials

---

**Last Updated**: January 2026  
**Resend Version**: Latest  
**Next.js Version**: 15+

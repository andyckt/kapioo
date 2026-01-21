# 🚀 Resend Quick Start (5 Minutes)

## Step 1: Get Your API Key (2 min)

1. Go to **[resend.com](https://resend.com)** and sign up
2. Click **API Keys** → **Create API Key**
3. Copy the key (starts with `re_...`)

## Step 2: Add to Environment (1 min)

Add to `.env.local` (development):
```bash
RESEND_API_KEY=re_your_api_key_here
```

Add to Vercel (production):
1. Vercel Dashboard → Settings → Environment Variables
2. Add `RESEND_API_KEY` with your key
3. Select all environments (Production, Preview, Development)
4. Save

## Step 3: Test It (2 min)

```bash
node scripts/test-resend-email.js your-email@example.com
```

Check your inbox! ✉️

## Step 4: Deploy

```bash
git add .
git commit -m "Migrate to Resend email service"
git push
```

Vercel will auto-deploy! 🎉

## That's It!

All 15 email types now use Resend:
- ✅ Verification emails
- ✅ Password resets
- ✅ Order confirmations
- ✅ Admin notifications
- ✅ Everything else!

## Need Help?

- 📖 Full Guide: `RESEND-SETUP-GUIDE.md`
- 📋 Summary: `RESEND-MIGRATION-SUMMARY.md`
- 🔧 Env Vars: `ENV-VARIABLES.md`

## Cost

- **Free**: 3,000 emails/month
- **Your Usage**: ~1,400/month
- **Cost**: $0 🎉

---

**Questions?** Check the docs or contact support@resend.com

# Cron Job Setup Guide - Using Cron-Job.org (FREE)

## 📋 Current Situation

**Problem**: Vercel Hobby plan only allows daily cron jobs, but we need minute-level scheduling to send emails efficiently.

**Solution**: Use **Cron-Job.org** (free external service) to trigger our endpoint every minute.

---

## 🎯 Why Cron-Job.org?

| Feature | Cron-Job.org | Vercel Hobby | Vercel Pro |
|---------|--------------|--------------|------------|
| **Cost** | **FREE** | FREE | $20/month |
| **Frequency** | Every minute ✅ | Once per day ❌ | Every minute ✅ |
| **Reliability** | High (17+ years) | High | High |
| **Setup Time** | 5 minutes | N/A | Instant |

**Result**: Get Pro-level features for FREE!

---

## 🚀 Step-by-Step Setup

### **Step 1: Generate a CRON_SECRET**

This prevents unauthorized access to your cron endpoint.

```bash
# Generate a random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
a7f3e9c2b8d4f1a6e5c9b2d8f3a7e1c4b9d2f8a3e7c1b5d9f2a6e8c3b7d1f4a9
```

**Copy this value** - you'll need it in the next steps.

---

### **Step 2: Add CRON_SECRET to Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: (paste the secret from Step 1)
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**
6. **Redeploy** your app (Vercel will prompt you)

---

### **Step 3: Deploy Your Code**

```bash
git add .
git commit -m "Configure cron for external trigger (Cron-Job.org)"
git push
```

Wait for Vercel deployment to complete.

---

### **Step 4: Set Up Cron-Job.org**

#### 4.1 Create Account
1. Go to [https://cron-job.org](https://cron-job.org)
2. Click **Sign Up** (free, no credit card needed)
3. Verify your email

#### 4.2 Create Cron Job
1. Click **Create Cron Job**
2. Fill in the form:

**Basic Settings:**
```
Title: Kapioo - Process Email Jobs
Address: https://kapioo.com/api/cron/process-next-week-email-jobs
```

**Schedule:**
```
Type: Every minute
Pattern: * * * * *
```

**Request Settings:**
```
Request Method: POST
Request Timeout: 30 seconds
```

**Authentication:**
```
HTTP Headers:
  - Name: Authorization
  - Value: Bearer YOUR_CRON_SECRET_HERE
```
(Replace `YOUR_CRON_SECRET_HERE` with the secret from Step 1)

**Notifications:**
```
☑ Enable notifications on failures
Email: your-email@example.com
```

3. Click **Create**

---

### **Step 5: Test the Setup**

#### 5.1 Manual Test
```bash
# Replace with your actual values
curl -X POST https://kapioo.com/api/cron/process-next-week-email-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected response:**
```json
{
  "success": true,
  "message": "No pending next-week email jobs to process"
}
```

#### 5.2 Create a Test Job

1. Go to your admin dashboard
2. Navigate to **Next Week Menu Email**
3. Click **Send test email to myself**
4. Verify email arrives

5. Click **Send to All Users** (or select a few test users)
6. Watch the progress dialog
7. Cron-Job.org will process 20 users every minute automatically

---

## 📊 How It Works

### **Email Sending Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin creates email job in dashboard                    │
│     → Creates NextWeekMenuEmailJob in MongoDB               │
│     → Status: "pending", cursor: 0, totalUsers: 500         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Cron-Job.org triggers every minute                      │
│     → POST /api/cron/process-next-week-email-jobs           │
│     → With Authorization header                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Cron endpoint processes 20 users                        │
│     → Finds job with cursor < totalUsers                    │
│     → Acquires distributed lock                             │
│     → Sends 20 emails (with 250ms delays)                   │
│     → Updates cursor: 0 → 20                                │
│     → Releases lock                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Next minute: Cron-Job.org triggers again                │
│     → Processes users 20-39                                 │
│     → Updates cursor: 20 → 40                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Repeats every minute)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. After 25 minutes: All 500 users processed               │
│     → cursor: 500 >= totalUsers: 500                        │
│     → Job status: "completed"                               │
│     → Cron continues running but finds no pending jobs      │
└─────────────────────────────────────────────────────────────┘
```

### **Processing Speed:**
```
20 users per minute
× 60 minutes per hour
= 1,200 users per hour

For 500 users:
500 ÷ 20 = 25 minutes ✅
```

---

## 🔒 Security

### **Why CRON_SECRET is Important:**

Without authentication, anyone could trigger your cron endpoint:
```bash
# Bad: Anyone can spam your endpoint
curl -X POST https://kapioo.com/api/cron/process-next-week-email-jobs
```

With CRON_SECRET:
```typescript
// In route.ts
const isAuthorizedCronCall = (request: Request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Dev mode
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
};

// Returns 401 Unauthorized if secret doesn't match
```

**Result**: Only Cron-Job.org (with correct secret) can trigger the endpoint.

---

## 📈 Monitoring

### **In Cron-Job.org Dashboard:**
- View execution history
- See success/failure rates
- Get email alerts on failures
- Check response times

### **In Your Admin Dashboard:**
- Real-time progress tracking
- Sent/failed counts
- Failed email details
- Job completion status

### **In MongoDB:**
```javascript
// Check job status
db.nextweekmenujobs.find().sort({ createdAt: -1 }).limit(5)

// Example output:
{
  _id: "...",
  status: "completed",
  totalUsers: 500,
  sentCount: 495,
  failedCount: 5,
  cursor: 500,
  createdAt: "2026-02-21T09:00:00Z",
  completedAt: "2026-02-21T09:25:00Z"
}
```

---

## 🐛 Troubleshooting

### **Issue 1: Cron-Job.org shows "401 Unauthorized"**

**Cause**: CRON_SECRET mismatch

**Solution**:
1. Check CRON_SECRET in Vercel environment variables
2. Check Authorization header in Cron-Job.org settings
3. Make sure format is: `Bearer YOUR_SECRET` (with space after "Bearer")

---

### **Issue 2: Emails not sending**

**Cause**: Job not being processed

**Solution**:
1. Check Cron-Job.org execution history
2. Check if cron is running every minute
3. Verify endpoint URL is correct
4. Check MongoDB for job status

---

### **Issue 3: "No pending jobs" message**

**Cause**: No jobs created or all jobs completed

**Solution**:
1. Go to admin dashboard
2. Create a new email job
3. Wait 1 minute for cron to process

---

## 🔄 Alternative: GitHub Actions (Also Free)

If you prefer not to use a third-party service:

### **Create `.github/workflows/cron-email.yml`:**

```yaml
name: Process Email Jobs
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes (GitHub minimum)
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger email processing
        run: |
          curl -X POST https://kapioo.com/api/cron/process-next-week-email-jobs \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Add CRON_SECRET to GitHub:**
1. Go to your repo → Settings → Secrets and variables → Actions
2. Add secret: `CRON_SECRET`

**Pros:**
- ✅ Free
- ✅ No third-party dependency
- ✅ You already use GitHub

**Cons:**
- ⚠️ Minimum 5-minute intervals (not every minute)
- ⚠️ Slower: 500 users in ~2 hours instead of 25 minutes

---

## 💰 Cost Comparison

| Solution | Setup Time | Monthly Cost | Processing Speed | Reliability |
|----------|-----------|--------------|------------------|-------------|
| **Cron-Job.org** | 5 min | **$0** | 500 users in 25 min | ⭐⭐⭐⭐⭐ |
| **GitHub Actions** | 10 min | **$0** | 500 users in 2 hours | ⭐⭐⭐⭐ |
| **Vercel Pro** | 0 min | **$20** | 500 users in 25 min | ⭐⭐⭐⭐⭐ |
| **EasyCron** | 5 min | **$2.99** | 500 users in 25 min | ⭐⭐⭐⭐ |

**Recommendation**: Use **Cron-Job.org** for best balance of cost, speed, and reliability.

---

## ✅ Checklist

Before going live, make sure:

- [ ] CRON_SECRET generated and added to Vercel
- [ ] Code deployed to Vercel
- [ ] Cron-Job.org account created
- [ ] Cron job configured with correct URL and secret
- [ ] Test email sent successfully
- [ ] Test job created and processed
- [ ] Monitoring/notifications enabled
- [ ] Team knows how to use the system

---

## 📞 Support

If you encounter issues:

1. Check Cron-Job.org execution logs
2. Check Vercel function logs
3. Check MongoDB job status
4. Verify CRON_SECRET matches everywhere

---

**Setup complete! Your email system will now process jobs automatically every minute, completely free.** 🎉

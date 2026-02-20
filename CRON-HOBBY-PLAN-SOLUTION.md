# Cron Job Solution for Vercel Hobby Plan

## Problem

Vercel Hobby plan only allows **daily cron jobs** (once per day), but the original implementation used `* * * * *` (every minute) which requires a Pro plan.

**Error:**
```
Hobby accounts are limited to daily cron jobs. 
This cron expression (* * * * *) would run more than once per day. 
Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel.
```

---

## Solution Options

### ✅ **Option 1: Stay on Hobby Plan (Free) - IMPLEMENTED**

The code has been modified to work with Hobby plan limitations:

#### Changes Made:

1. **Cron Schedule Changed**
   - **Before**: `* * * * *` (every minute)
   - **After**: `0 9 * * *` (once daily at 9:00 AM UTC)
   - File: `vercel.json`

2. **Chunk Size Optimized**
   - **Before**: 20 users per run
   - **After**: 30 users per run (fits in 10-second timeout)
   - File: `app/api/cron/process-next-week-email-jobs/route.ts`

3. **Manual Trigger Added**
   - New endpoint: `/api/admin/trigger-email-processing`
   - Allows admin to manually process more emails
   - Button in admin UI: "Process Now (30 more emails)"

#### How It Works:

```
Day 1, 9:00 AM UTC:
- Cron runs automatically
- Processes 30 users (~6 seconds)
- Job status: 30 of 500 sent

Admin can then:
- Click "Process Now" button repeatedly
- Each click processes 30 more users
- Takes ~6 seconds per click
- For 500 users: ~17 clicks needed (~2 minutes total)

Day 2, 9:00 AM UTC:
- If job not complete, cron processes 30 more
- Admin can continue clicking "Process Now"
```

#### Pros:
- ✅ **Free** - No upgrade needed
- ✅ Works within Hobby plan limits
- ✅ Admin has full control
- ✅ Can process all emails in ~2 minutes (if admin clicks button)

#### Cons:
- ❌ Requires manual intervention (clicking "Process Now")
- ❌ Not fully automated
- ❌ If admin forgets, emails send slowly (30 per day)

---

### 🚀 **Option 2: Upgrade to Pro Plan ($20/month)**

If you want fully automated, fast email sending:

#### Benefits:
- ✅ Cron runs **every minute** automatically
- ✅ No manual intervention needed
- ✅ 500 users processed in ~17 minutes (fully automated)
- ✅ 60-second function timeout (vs 10s on Hobby)
- ✅ Better for production/scaling

#### To Upgrade:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard/settings)
2. Click "Upgrade to Pro"
3. Revert the cron schedule back to `* * * * *` in `vercel.json`
4. Redeploy

---

## Current Configuration (Hobby Plan)

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/process-next-week-email-jobs",
      "schedule": "0 9 * * *"  // Daily at 9 AM UTC
    }
  ],
  "functions": {
    "app/api/cron/process-next-week-email-jobs/route": {
      "maxDuration": 10,  // Hobby plan limit
      "memory": 512
    }
  }
}
```

### Cron Worker Settings
```typescript
const CHUNK_SIZE = 30;           // Process 30 users per run
const SEND_INTERVAL_MS = 200;    // 5 req/s (under 6 req/s limit)
```

**Processing Time per Run:**
- 30 users × 200ms = 6 seconds
- Fits comfortably in 10-second timeout

---

## Admin Workflow (Hobby Plan)

### Sending Emails to 500 Users

1. **Create Job**
   - Go to Admin Dashboard → Next Week Menu Email
   - Click "Send to All Users"
   - Confirm

2. **Progress Dialog Opens**
   - Shows: "Sent 0 of 500 emails (0%)"
   - Button visible: "Process Now (30 more emails)"

3. **Manual Processing**
   - Click "Process Now" button
   - Wait ~6 seconds
   - Progress updates: "Sent 30 of 500 (6%)"
   - Click again: "Sent 60 of 500 (12%)"
   - Continue clicking until complete

4. **Automated Daily Processing**
   - Every day at 9 AM UTC, cron processes 30 more
   - If you forget to click, it will eventually complete
   - 500 users ÷ 30 per day = ~17 days (if no manual clicks)

---

## Switching to Pro Plan Later

If you upgrade to Pro later, revert these changes:

### 1. Update vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/process-next-week-email-jobs",
      "schedule": "* * * * *"  // Every minute
    }
  ],
  "functions": {
    "app/api/cron/process-next-week-email-jobs/route": {
      "maxDuration": 60,  // Pro plan allows 60s
      "memory": 1024
    }
  }
}
```

### 2. Update route.ts
```typescript
const CHUNK_SIZE = 20;           // Can be smaller with frequent runs
const SEND_INTERVAL_MS = 250;    // 4 req/s
```

### 3. Remove "Process Now" button (optional)
The button still works on Pro plan, but it's not needed since cron runs every minute.

---

## Testing

### Test the Manual Trigger
```bash
# From your terminal
curl -X POST https://your-domain.com/api/admin/trigger-email-processing
```

### Test the Cron Endpoint
```bash
# With CRON_SECRET (if set)
curl -X POST https://your-domain.com/api/cron/process-next-week-email-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Without CRON_SECRET
curl -X POST https://your-domain.com/api/cron/process-next-week-email-jobs
```

---

## Monitoring

### Check Job Status
```javascript
// In browser console or admin UI
fetch('/api/admin/next-week-email-jobs')
  .then(r => r.json())
  .then(console.log)
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "jobId": "abc123",
      "status": "processing",
      "totalUsers": 500,
      "sentCount": 120,
      "failedCount": 5,
      "cursor": 125,
      "progress": 25,
      "createdAt": "2026-02-21T09:00:00Z"
    }
  ]
}
```

---

## Recommendation

**For Development/Testing**: Use Hobby plan with manual trigger (current setup)

**For Production**: Upgrade to Pro plan for fully automated email sending

The current implementation gives you flexibility to start free and upgrade when needed!

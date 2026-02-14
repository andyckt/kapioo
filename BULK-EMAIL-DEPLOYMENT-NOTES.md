# Bulk Email Sending - Deployment Notes

## Production Requirements

### Vercel Plan Requirements

The bulk email sending feature requires **extended function timeouts** to handle large user bases:

- **441 users** → ~74 seconds to complete
- **Requires Vercel Pro or Enterprise plan** with `maxDuration: 300` configured

### Timeout Limits by Plan

| Vercel Plan | Max Duration | Bulk Email Support |
|------------|--------------|-------------------|
| Hobby | 10 seconds | ❌ No (too short) |
| Pro | 60 seconds (300s in sin1 region) | ✅ Yes |
| Enterprise | 300 seconds | ✅ Yes |

### Configuration

The timeout is configured in `vercel.json`:

```json
"functions": {
  "app/api/admin/notify-next-week-menu/route": {
    "maxDuration": 300,
    "memory": 1024
  }
}
```

## Rate Limiting Strategy

To respect Resend's rate limit (6 requests/second):

- **Batch size:** 12 emails per batch
- **Delay between batches:** 2 seconds
- **Average rate:** 6 emails/second (exactly at limit)
- **Total time for 441 users:** ~74 seconds

## SSE Connection Keep-Alive

The Server-Sent Events (SSE) stream sends heartbeat messages every 200ms during delays to prevent connection timeouts:

```typescript
// Heartbeat every 200ms to keep connection alive
for (let i = 0; i < heartbeatCount; i++) {
  await new Promise(resolve => setTimeout(resolve, 200));
  controller.enqueue(encoder.encode(`: heartbeat\n\n`));
}
```

## Troubleshooting

### Issue: "Stuck" at Batch X of Y

**Cause:** Vercel function timeout exceeded (10s on Hobby, 60s on Pro)

**Solution:**
1. Upgrade to Vercel Pro plan
2. Verify `vercel.json` has `maxDuration: 300` for the route
3. Deploy and test again

### Issue: "429 Too Many Requests" from Resend

**Cause:** Rate limit exceeded (>6 requests/second)

**Solution:** The code already handles this with batch delays. If still occurring, increase `delayBetweenBatches` in the route file.

### Issue: Connection timeout on mobile

**Cause:** Mobile networks may have stricter timeouts for long connections

**Solution:** The heartbeat mechanism should prevent this, but if issues persist:
1. Reduce batch size (e.g., to 10 emails)
2. Increase delay (e.g., to 2.5 seconds)
3. This will make it slower but more reliable on poor connections

## Monitoring

Check the Vercel function logs for progress:

```
[Email Sending] Starting to send emails to 441 users in 37 batches
[Email Sending] Batch 1/37: Processing 12 emails
[Email Sending] Batch 2/37: Processing 12 emails
...
[Email Sending] Completed! Sent: 441, Failed: 0, Total: 441
```

## Alternative Approach (Future)

For very large user bases (1000+ users), consider:

1. **Background jobs** with a queue system (e.g., Vercel Cron + Queue)
2. **Chunked processing** where frontend requests multiple smaller batches
3. **External worker** (e.g., AWS Lambda with extended timeout)

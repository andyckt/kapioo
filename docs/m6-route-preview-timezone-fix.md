# M6 Route Preview Timezone Fix

**Date:** 2026-05-29  
**Scope:** Milestone 6 cleanup — correct Toronto-local finish and stop ETAs in Simple Route Preview.

---

## Diagnosis

### Symptom

- Payload sends `run_date` + `start_time: "10:00"` (intended as **10:00 AM America/Toronto**)
- Route Optimizer returns plausible `total_duration_minutes` (~255)
- Admin UI showed:
  - Estimated finish: **May 31, 2026, 10:15 AM**
  - First stop ETA: **~10:04 AM**
- Expected finish: **~2:15 PM Toronto** (10:00 AM + 255 minutes)

### Root cause (Route Optimizer)

Route Optimizer computes start/finish/ETAs using:

```typescript
new Date(`${run.run_date}T${run.start_time}:00`)
```

In `computeRouteFromSequence.ts` and `buildRunIntegrationResponse.ts`.

On deployed servers (UTC), that string is interpreted as **10:00 UTC**, not 10:00 Toronto.

| Step | UTC interpretation | Toronto display (EDT, UTC−4) |
|------|-------------------|------------------------------|
| Start | 10:00 UTC | 6:00 AM *(not shown)* |
| +255 min finish | 14:15 UTC | **10:15 AM** ✓ matches bug |
| First stop +4 min | 14:04 UTC | **10:04 AM** ✓ matches bug |

**Kapoo Admin formatting was correct** — `formatDateTime` uses `America/Toronto`. The ISO timestamps from Route Optimizer represented the wrong absolute instants.

**Duration math is consistent** with UTC-based start; only the timezone anchor is wrong.

### Not the issue

- Kapoo UI formatting (`formatDateTime`) — working as designed
- Stop count mapping (fixed in prior M6 cleanup) — separate issue, already resolved

---

## Fix (Kapoo Admin — M6 scope)

Route Optimizer was **not changed** (per M6 constraints). Kapoo recomputes display times server-side when mapping the preview response:

1. Parse **delivery date + start time** as `America/Toronto` local (`parseTorontoLocalDateTime`)
2. **Estimated finish** = Toronto start + `total_duration_minutes`
3. **Stop ETAs** = walk `optimized_route.stops[]` using each stop’s `duration_from_previous` (+ default 5 min service time between stops, matching Route Optimizer)

Context passed from orchestrator:

```typescript
mapRouteOptimizerPreviewResult(routeResult, {
  deliveryDate,
  startTime: SIMPLE_ROUTE_PREVIEW_START_TIME, // "10:00"
});
```

If recompute context is missing or stops lack `duration_from_previous`, Kapoo falls back to Route Optimizer timestamps (legacy path).

---

## Files changed

| File | Change |
|------|--------|
| `lib/agents/delivery/route-preview-time.ts` | **New** — Toronto local parse, finish + stop ETA computation |
| `lib/agents/delivery/map-route-optimizer-preview-result.ts` | Recompute finish/ETAs when context + leg durations available |
| `lib/agents/delivery/build-simple-route-preview-payload.ts` | Export `SIMPLE_ROUTE_PREVIEW_START_TIME` constant |
| `lib/agents/delivery/preview-simple-route.ts` | Pass delivery date + start time into mapper |
| `__tests__/unit/agents/delivery/route-preview-time.test.ts` | **New** — Toronto parse, finish, stop ETA tests |
| `__tests__/unit/agents/delivery/map-route-optimizer-preview-result.test.ts` | Timezone recompute + fallback tests |
| `__tests__/unit/agents/delivery/preview-simple-route.test.ts` | Orchestrator uses recomputed ETAs |

### Unchanged

- Route Optimizer service
- M7 / smart planning / batch-create / run persistence
- Order preview blocking rules

---

## Expected behavior after fix

| Field | Example (May 31, 2026, start 10:00, duration 255.41 min) |
|-------|----------------------------------------------------------|
| Estimated finish (UI) | **May 31, 2026, 2:15 PM** |
| First stop ETA (4.11 min travel) | **May 31, 2026, 10:04 AM** |
| Duration / distance | Still from Route Optimizer response |

---

## Follow-up (outside M6)

Route Optimizer should parse `run_date` + `start_time` as **America/Toronto** (or accept an explicit timezone) in:

- `lib/routing/computeRouteFromSequence.ts`
- `lib/integration/buildRunIntegrationResponse.ts`

That would fix ETAs at the source for all integrations, not only Kapoo Admin preview remapping.

---

## Verification

```bash
npm run test -- __tests__/unit/agents/delivery/route-preview-time.test.ts __tests__/unit/agents/delivery/map-route-optimizer-preview-result.test.ts __tests__/unit/agents/delivery
```

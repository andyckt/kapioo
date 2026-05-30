# M6 Route Preview Stop Mapping Fix

**Date:** 2026-05-29  
**Scope:** Milestone 6 cleanup only — fix optimized stop mapping and admin time display.

---

## What Route Optimizer actually returns

The live `POST /api/integrations/runs/optimize-preview` response (from Route Optimizer `buildPreviewRunResponse`) uses this shape:

```json
{
  "preview": true,
  "persisted": false,
  "run_id": null,
  "status": "preview",
  "total_duration_minutes": 95,
  "total_distance_km": 42.1,
  "estimated_finish_time": "2026-05-31T14:15:24.600Z",
  "optimized_route": {
    "total_duration_minutes": 95,
    "total_distance_km": 42.1,
    "stops": [
      {
        "customer_index": 0,
        "customer_name": "Customer A",
        "customer_phone": "4165550001",
        "customer_address": "250 Yonge St, Toronto",
        "eta": "2026-05-31T15:20:00.000Z",
        "order_ids": ["DD-90000001"]
      }
    ]
  },
  "validation_errors": [],
  "warnings": [],
  "geocode_failures": []
}
```

Key points:

- Top-level summary fields (`total_duration_minutes`, `total_distance_km`, `estimated_finish_time`) are flattened for integrations.
- **Stop sequence lives at `optimized_route.stops[]`**, not directly on `optimized_route` as an array.
- Each stop uses Route Optimizer field names: `customer_name`, `customer_address`, `eta` / `arrival_time`, `order_ids`.

Reference: Route Optimizer repo `src/lib/integration/buildRunIntegrationResponse.ts` and `docs/delivery-agent-integration.md`.

---

## Why optimized stops showed as 0

Kapioo’s mapper in `map-route-optimizer-preview-result.ts` assumed:

```typescript
Array.isArray(result.optimized_route) ? result.optimized_route : []
```

Route Optimizer returns `optimized_route` as an **object** `{ stops: [...] }`, not an array.

Because `Array.isArray({ stops: [...] })` is `false`, Kapioo treated the route as empty → `stopCount = 0` and no rows in the admin table, even though duration/distance/finish time (read from top-level fields) still displayed correctly.

---

## What changed

| File | Change |
|------|--------|
| `lib/agents/delivery/map-route-optimizer-preview-result.ts` | Read stops from `optimized_route.stops`; map `customer_name`, `customer_address`, `eta`/`arrival_time`, `order_ids`; keep legacy flat-array fallback |
| `lib/integrations/route-optimizer/types.ts` | Document actual `OptimizedRoute` object shape |
| `features/admin-delivery-agent/admin-delivery-agent-tab.tsx` | Format estimated finish + stop ETAs with `formatDateTime` (Toronto timezone) |
| `__tests__/unit/agents/delivery/map-route-optimizer-preview-result.test.ts` | New tests for nested stops, empty route, legacy fallback |
| `__tests__/unit/agents/delivery/preview-simple-route.test.ts` | Updated mock RO response to nested `optimized_route.stops` shape |

### Unchanged

- M5 order preview / blocking rules
- Route Optimizer client request behavior
- Simple one-run preview note in UI
- No Milestone 7 / smart planning / batch-create / run persistence

---

## Tests updated

- **`map-route-optimizer-preview-result.test.ts`**
  - Maps stops from `optimized_route.stops`
  - Correct stop count (2)
  - Empty `stops: []` → count 0
  - `optimized_route: null` → count 0
  - Legacy flat-array fallback still works

- **`preview-simple-route.test.ts`**
  - Orchestrator test mock updated to nested RO response shape

### Verification

```bash
npm run test -- __tests__/unit/agents/delivery/map-route-optimizer-preview-result.test.ts __tests__/unit/agents/delivery/preview-simple-route.test.ts __tests__/unit/agents/delivery
```

---

## Admin UI after fix

- **Stop count:** matches `optimized_route.stops.length`
- **Table columns:** sequence, name, address, ETA, order IDs
- **Estimated finish / ETAs:** rendered via `formatDateTime` → e.g. `May 31, 2026, 10:15 AM` (America/Toronto)
- **Note retained:** *"This is a simple one-run test preview. Smart DT/UT/Self planning will be added later."*

# Kitchen Agent API

Internal API for the local Kitchen Agent to fetch daily and weekly order data by target delivery date, replacing manual Excel exports.

**Status:** Implemented  
**Endpoint:** `GET /internal-api/kitchen/orders`

---

## Endpoint

```
GET /internal-api/kitchen/orders?date=YYYY-MM-DD&source=daily|weekly|all
```

| Query param | Required | Default | Description |
|-------------|----------|---------|-------------|
| `date` | Yes | — | Target delivery date in ISO format (`YYYY-MM-DD`) |
| `source` | No | `all` | `daily`, `weekly`, or `all` |

### Authentication

```
Authorization: Bearer <KITCHEN_API_KEY>
```

| Response | Body |
|----------|------|
| 401 Unauthorized | `{ "error": "Unauthorized" }` |
| 400 Bad Request | `{ "error": "Invalid date format. Expected YYYY-MM-DD." }` |
| 500 Internal Server Error | `{ "error": "Failed to fetch kitchen orders", "request_id": "..." }` |

---

## Environment variable

```bash
KITCHEN_API_KEY=your-secret-key-here
```

Add to `.env` locally and to the deployment environment. If the variable is missing or the token is wrong, the API returns 401.

---

## Files

### Modified

- `lib/env.ts` — `getKitchenApiKey()`

### Added

| File | Purpose |
|------|---------|
| `lib/agents/kitchen/auth.ts` | Bearer token auth (constant-time compare) |
| `lib/agents/kitchen/types.ts` | Response types + `KITCHEN_INCLUDE_STATUSES` |
| `lib/agents/kitchen/aggregate-daily-combos.ts` | Daily dish-level aggregation |
| `lib/agents/kitchen/aggregate-weekly-combos.ts` | Weekly dish-level aggregation |
| `lib/agents/kitchen/get-weekly-orders-for-date.ts` | Weekly order reader |
| `lib/agents/kitchen/get-orders-for-kitchen-prep.ts` | Orchestrator |
| `app/internal-api/kitchen/orders/route.ts` | API route handler |

### Reused (unchanged)

- `lib/order-data/get-daily-orders-base.ts`
- `lib/orders/admin-daily-query.ts` → `buildSingleDateFormats()`
- `models/DailyDeliveryOrder.ts`, `models/WeeklyOrder.ts`

### Tests

- `__tests__/unit/agents/kitchen/aggregate-daily-combos.test.ts`
- `__tests__/unit/agents/kitchen/aggregate-weekly-combos.test.ts`
- `__tests__/integration/agents/kitchen/kitchen-orders-route.test.ts`

---

## Business rules

### Status filtering

| Included | Excluded |
|----------|----------|
| `pending`, `confirmed` | `cancelled`, `refunded`, `delivery`, `delivered` |

There is no separate unpaid status — both products deduct vouchers at order creation. `debug.excluded_order_summary.unpaid` is always `0`.

### Date handling

- API input: ISO `YYYY-MM-DD` (target delivery date, not order creation date).
- Stored format: `"May 31"` (no year) on `items[].date`.
- Matching uses `buildSingleDateFormats()` to handle zero-padded variants (`"May 5"` vs `"May 05"`).

### Daily Delivery

- Model: `DailyDeliveryOrder`
- Item fields: `comboName`, `type` (`A` = 2-dish, `B` = 3-dish), `quantity`, `dishes[]` (snapshotted at order time).
- Fetched via `getDailyOrdersBase()` with `sliceItemsToDeliveryDate: true`.

**Aggregation per combo:**

1. Sum `quantity` into each dish listed on that order line.
2. Assign `dish_role`:
   - `common` — dish appears in any 2-dish (`type: "A"`) line for that combo.
   - `extra` — dish appears only in 3-dish (`type: "B"`) lines.

**Example:**

| Line | Quantity | Dishes |
|------|----------|--------|
| 2-dish (A) | 10 | 板栗炖鸡, 时蔬 |
| 3-dish (B) | 6 | 冬瓜丸子汤, 板栗炖鸡, 时蔬 |

Result:

| Dish | Servings | Role |
|------|----------|------|
| 冬瓜丸子汤 | 6 | extra |
| 板栗炖鸡 | 16 | common |
| 时蔬 | 16 | common |

A warning is emitted when a combo has only 3-dish orders (common/extra roles may be inaccurate).

### Weekly Meal Box

- Model: `WeeklyOrder`
- Item fields: `optionName`, `quantity`, `date`.
- `optionName` is the customer-facing combo name (often `" + "`-joined dishes, e.g. `豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭`).

**Aggregation per combo:**

1. Group by `optionName`; total servings = sum of `quantity`.
2. Split `optionName` on `" + "`; each dish gets the same total servings.
3. Single-name options (no separator) are treated as one dish.

**Example:** total quantity 21 → each of three dishes gets 21 servings.

### Sunday / Tuesday two-round rule

The API returns both daily and weekly data for any requested date. The Kitchen Agent maps:

- Daily → 【1轮】
- Weekly → 【2轮】

Two-round mode applies only when `target_delivery_date` is Sunday or Tuesday; the API itself does not add round labels.

---

## Response shape

```json
{
  "target_delivery_date": "2026-05-31",
  "daily": {
    "source_type": "daily",
    "orders_count": 2,
    "combos": [
      {
        "combo_name": "套1",
        "dishes": [
          { "dish_name": "冬瓜丸子汤", "servings": 6, "dish_role": "extra" },
          { "dish_name": "板栗炖鸡", "servings": 16, "dish_role": "common" },
          { "dish_name": "时蔬", "servings": 16, "dish_role": "common" }
        ]
      }
    ]
  },
  "weekly": {
    "source_type": "weekly",
    "orders_count": 1,
    "combos": [
      {
        "combo_name": "豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭",
        "dishes": [
          { "dish_name": "豆花水煮牛肉", "servings": 7 },
          { "dish_name": "红烧白萝卜香菇", "servings": 7 },
          { "dish_name": "糙米饭", "servings": 7 }
        ]
      }
    ]
  },
  "warnings": [],
  "debug": {
    "included_order_ids": ["DD-80000001", "DD-80000002", "WO-80000001"],
    "excluded_order_summary": {
      "cancelled": 0,
      "refunded": 0,
      "unpaid": 0,
      "wrong_date": 0
    }
  }
}
```

- No customer PII is returned.
- When `source=daily` or `source=weekly`, the other section is empty (`orders_count: 0`, `combos: []`).
- Empty dates return empty combos, not an error.

---

## Manual testing

### Local dev

```bash
curl -H "Authorization: Bearer $KITCHEN_API_KEY" \
  "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31"
```

### Daily only

```bash
curl -H "Authorization: Bearer $KITCHEN_API_KEY" \
  "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31&source=daily"
```

### Weekly only

```bash
curl -H "Authorization: Bearer $KITCHEN_API_KEY" \
  "http://localhost:3000/internal-api/kitchen/orders?date=2026-05-31&source=weekly"
```

### Production

```bash
curl -H "Authorization: Bearer $KITCHEN_API_KEY" \
  "https://YOUR_DOMAIN/internal-api/kitchen/orders?date=2026-05-31"
```

### Automated tests

```bash
npm test -- __tests__/unit/agents/kitchen __tests__/integration/agents/kitchen/kitchen-orders-route.test.ts
```

---

## Test checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Missing API key | 401 |
| 2 | Wrong API key | 401 |
| 3 | Missing date | 400 |
| 4 | Invalid date format | 400 |
| 5 | Valid date with daily orders | Daily combos returned |
| 6 | Valid date with weekly orders | Weekly combos returned |
| 7 | Sunday/Tuesday with both | Both daily + weekly returned |
| 8 | Date with no orders | Empty combos |
| 9 | Cancelled/refunded orders | Excluded from combos; counted in debug |
| 10 | Orders on other delivery dates | Excluded |

---

## Assumptions

| Topic | Assumption |
|-------|------------|
| Status mapping | Include `pending` + `confirmed`; exclude terminal/in-transit statuses |
| Payment | Voucher deducted at order creation; no unpaid bucket in data |
| Date storage | `items[].date` is month-short + day without year |
| Daily dishes | Snapshotted in `items[].dishes[]` at order time |
| Weekly dishes | Derived by splitting `optionName` on `" + "` |
| Test orders | No separate test flag — all non-excluded statuses are included |
| Security | Route is not in middleware session allowlist; protected by API key only |

---

## Logging

Server-side logs (API key is never logged):

- Request received (`request_id`)
- Requested date and source
- Daily / weekly orders included
- Excluded counts by reason
- `request_id` on errors

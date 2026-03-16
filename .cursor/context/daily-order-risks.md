# Daily Order Domain: Risks and Current State

Concise handoff for the daily-order domain. The **daily domain is still riskier than the weekly domain** right now.

## Historical Context: Competing Paths

The repo historically had two daily-order families with incompatible contracts:

- **Canonical**: `DailyDeliveryOrder` model, `app/api/daily-delivery/order/`, `app/api/admin/daily-delivery/orders/`
- **Legacy**: `Order` model, `app/api/orders/`, `app/api/orders/[id]/`, `app/api/users/[id]/orders/`

Consumer confusion, schema drift, and dual sources of truth were common before Phase 2.

## What Phase 2 Already Cleaned Up

- **Phase 2B**: Admin and customer consumers migrated to canonical daily surfaces. Legacy components (`order-management.tsx`, `order-history.tsx`) were routed through `view-all-orders` and `daily-delivery-history` and later **removed entirely** in Phase 2E.
- **Phase 2B**: Stats and count routes (`orders/stats`, `users/[id]/orders/count`, etc.) now read from `DailyDeliveryOrder`.
- **Phase 2B**: Legacy user-order list `app/api/users/[id]/orders` reads from `DailyDeliveryOrder` instead of `Order`.
- **Phase 2B**: Legacy write entrypoints (`POST /api/orders`, `PATCH /api/orders/[id]`) return `410` and no longer accept new writes.
- **Phase 2E**: Legacy order read paths (`/api/orders`, `/api/orders/[id]`, `/api/users/[id]/orders`) retired with `410` responses.
- **Phase 2E**: `order-management.tsx`, `order-history.tsx`, and `lib/middleware.ts` **removed**.
- **Phase 2E**: `middleware.ts` no longer treats `/api/orders` as an active authenticated API prefix.

## What Is Still Unresolved or Risky

1. **Two order models still exist**: `models/Order.ts` (legacy) and `models/DailyDeliveryOrder.ts` (canonical). Any code that imports or references `Order` can re-introduce confusion.

2. **410 stub routes still exist**: `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/orders/stats/route.ts`, `app/api/users/[id]/orders/route.ts` are present and return 410. They are not deleted. Future cleanup could remove them once all callers are verified gone.

3. **Order placement is not transactional**: `app/api/daily-delivery/order/route.ts` creates orders and mutates balances without MongoDB transactions. Partial failure can leave orders, balances, and transaction records out of sync.

4. **Admin daily routes have inline schema duplication**: Unlike weekly (fixed in Phase 2C-1), `app/api/admin/daily-delivery/orders/route.ts` and `app/api/admin/daily-delivery/orders/[id]/status/route.ts` still redefine schema structures inline instead of importing from the model.

5. **Balance mutation overlap**: Credits flow through canonical `update-balance`, but vouchers and other entitlement paths may still have overlapping or non-consolidated endpoints.

## Why Daily Canonicalization Is Still a "Must Fix"

- There is **no single trustworthy daily-order source of truth**: two models and multiple route families exist.
- Risk of **silent domain drift** if anyone adds logic that assumes `Order` or legacy paths are live.
- Schema duplication in admin daily routes increases **schema drift** risk.
- Full retirement of the `Order` model and 410 stubs has not been done—structural ambiguity remains.

## Watchouts for Future Sessions

| Area | Watchout |
|------|----------|
| **Transactions** | Order placement + balance mutation are **not** atomic. Avoid adding new order-creation logic without considering transaction boundaries. |
| **Order/balance mutations** | Manual balance changes should use the canonical `update-balance` route. Do not add tooling that bypasses it. |
| **Admin flows** | Admin daily-order logic lives in `view-all-orders`, `daily-delivery-management`, and admin daily-delivery APIs. Schema is duplicated inline—avoid adding new inline shapes. |
| **Legacy stubs** | `app/api/orders/*` and `app/api/users/[id]/orders` return 410. Do not assume they are dead code and delete without verifying no callers (including external services or cached clients) exist. |
| **models/Order.ts** | Still in the repo. Do not assume `Order` is retired; any new code that imports it reintroduces the dual-model risk. |

## What Not to Assume About the Daily Side

- Do **not** assume daily orders have a parent-child split model like weekly (they do not).
- Do **not** assume admin daily routes use centralized schema from the model (they do not; weekly does).
- Do **not** assume order placement is transactional (it is not).
- Do **not** assume `Order` is unused—it is still present; only consumers were migrated and write paths retired.
- Do **not** assume the 410 stub files can be deleted without a caller audit.

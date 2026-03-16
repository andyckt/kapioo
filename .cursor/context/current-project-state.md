# Current Project State

Quick summary of the technical and structural state of the kapioo codebase as of the last foundation hardening refresh.

## Major Phases Completed

- **Phase 1**: High-risk hardening work complete
- **Phase 2A**: Canonical-domain decision and inventory complete
- **Phase 2B**: Daily-order consolidation complete
- **Phase 2C**: Weekly lifecycle cleanup complete (2C-1 model ownership, 2C-2 status normalization, 2C-3 refund/entitlement hardening)
- **Phase 2D**: Balance-mutation consolidation complete (canonical `update-balance` endpoint, compatibility routes retired)
- **Phase 2E**: Consumer cleanup and dead-path removal complete (order-management, order-history, lib/middleware removed; legacy order routes return 410)
- **Post-Phase 2E**: Weekly-domain refinements complete (split parent-child model, display fixes, admin traceability, status-only child cancellation)

## Major Structural Improvements

- Balance mutations flow through canonical `app/api/users/[id]/update-balance/route.ts`; add/deduct/credits compatibility routes retired (410)
- Legacy order read paths (`/api/orders`, `/api/orders/[id]`, `/api/users/[id]/orders`) retired with 410 stubs
- Dead components removed: `order-management.tsx`, `order-history.tsx`, `lib/middleware.ts`
- Weekly split orders use parent-child model: `WeeklyEntitlementGroup` parent, child `WeeklyOrder` with `weeklyEntitlementGroupId` and `allocatedMealCount`
- Weekly admin status PATCH is fulfillment-only; no auto-refund/restoration from status changes
- Admin weekly UI shows voucher vs. meal semantics correctly; Linked Weekly Group section for traceability

## Currently Stable

- Plan catalog and service logic (`lib/plans/catalog.ts`, `lib/plans/service.ts`, `lib/plans/balances.ts`)
- Promo-code logic (`lib/promo-code.ts`)
- Weekly order model, status policy, entitlement display (`lib/orders/weekly-status.ts`, `lib/orders/weekly-entitlement-display.ts`)
- Canonical balance mutation API
- Weekly checkout and admin flows for new split orders
- Settings and isolated admin/settings APIs

## Remains Unfinished

- **Must Fix**: Daily-order canonicalization (competing Order vs DailyDeliveryOrder paths)
- **Must Fix**: Order placement and balance mutation not yet transactional
- **Must Fix**: Overlapping balance-mutation paths (vouchers, etc.) not fully consolidated
- **Must Fix**: Route-local schema duplication in daily admin order flows
- **Phase 3**: Admin/dashboard page decomposition and shared schema adoption
- **Phase 4**: Integration tests for auth, orders, refunds, balance correctness

## Current Known Risks

- Changes to daily-order behavior before canonical consolidation (Must Fix #1)
- Order/balance mutations without transactions (partial failure can leave inconsistent state)
- Manual-balance tooling that bypasses the consolidated update-balance service
- Giant orchestration files (`app/admin/page.tsx`, `app/dashboard/page.tsx`) still present—high regression blast radius

## Recommended Next Phase

**Phase 3: Maintainability improvements.** Start with admin-page decomposition. Extract lowest-risk slices first (settings, promo), then order/balance sections. Do not restart a full audit; continue from current state.

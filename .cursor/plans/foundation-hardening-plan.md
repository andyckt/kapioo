---
title: Foundation Hardening Plan
status: phase-4-test-hardening-complete
updated: 2026-04-12
---

# Foundation Hardening Plan

## Purpose
Turn the prior codebase health review into a practical execution roadmap that improves safety, correctness, and long-term maintainability before further core-commerce expansion.

How to read this plan:
- `Fact`: directly observed in the codebase.
- `Inference`: engineering judgment based on the observed structure and coupling.

## Current Status
- `Fact`: Phase 1 high-risk hardening work has been completed.
- `Fact`: Phase 2A through 2E are complete.
- `Fact`: Post-Phase 2E weekly-domain refinements are complete: split-order parent-child model, voucher/meal display fixes, admin traceability, and status-only child cancellation.
- `Fact`: **Phase 3b (admin decomposition)** is complete: domain slices under `features/admin-*`, shared `components/admin-orders`, lazy-loaded admin tab content, and thin legacy re-exports where applicable.
- `Fact`: **Phase 3c (typed API contracts)** is complete: `lib/api` response/validation helpers, `lib/contracts` Zod schemas, and route-by-route migration across `app/api` (Auth.js passthrough and SSE shapes preserved where needed).
- `Fact`: **Phase 3b cleanup (date formatting)** is complete: duplicated dashboard/history `formatDate` logic consolidated into `lib/format.ts` with optional locale for en/zh surfaces.
- `Fact`: The **next** major maintainability slices are **remaining Phase 3** work: further `app/dashboard/page.tsx` decomposition, checkout/management extraction if desired, and **Phase 4** integration tests. **Must Fix #1–4** remain correctness targets; Phase 3c reduces contract drift but does not replace transactional canonicalization.
- `Inference`: The weekly domain is in a materially better state than when the original plan was written; admin and API surfaces are now easier to change safely than pre–Phase 3b/3c.

## Checkpoint Summary (post–Phase 2E + weekly refinements + Phase 3b/3c)

| Area | Status |
|------|--------|
| **Phase 2** | 2A–2E complete. Post-2E weekly refinements (split parent-child, display fixes, traceability, status-only cancellation) complete. |
| **Phase 3b** | Admin-page decomposition complete (feature folders, lazy tabs, shared admin order types/hooks). |
| **Phase 3c** | Shared API infrastructure and Zod contracts; `app/api` migrated to the new pattern where applicable. |
| **Phase 3b cleanup** | Dashboard/history date display deduped via `lib/format.ts`. |
| **Next phase** | Remaining Phase 3 (dashboard/checkout/management extraction as needed) → **Phase 4** tests. |
| **Build next** | Optional: slim `app/dashboard/page.tsx`; extract heavy checkout/management components; add integration tests for orders/refunds/balances. |
| **Wait on** | Must Fix #1–4 remain for full correctness closure; Phase 3c improves maintainability and validation, not atomic order+balance writes. |
| **Risks to watch** | Daily-order path changes before #1 consolidation; order/balance mutations without transactions (#2); manual-balance tooling bypassing update-balance service. |

## Foundation Summary
- `Fact`: The healthiest centralized parts of the repo are plan/config logic in [`lib/plans/catalog.ts`](lib/plans/catalog.ts), [`lib/plans/service.ts`](lib/plans/service.ts), [`lib/plans/balances.ts`](lib/plans/balances.ts), [`lib/promo-code.ts`](lib/promo-code.ts), and [`lib/constants/areas.ts`](lib/constants/areas.ts).
- `Fact`: The highest-risk fragmentation is still around orders, refunds, entitlement mutations, and admin/customer flow boundaries, especially in [`app/api/orders/route.ts`](app/api/orders/route.ts), [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts), [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts), [`app/api/users/[id]/route.ts`](app/api/users/[id]/route.ts), [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts), [`app/admin/page.tsx`](app/admin/page.tsx), and [`app/dashboard/page.tsx`](app/dashboard/page.tsx).
- `Inference`: The codebase is safer than before, but the remaining structural work is still concentrated in the most coupled domains, so execution sequencing matters more than speed.

## Must Fix Now

### 1. Canonicalize the daily-order domain
- Problem: The repo still contains competing daily-order paths with incompatible contracts.
- Why it matters: There is no single trustworthy daily-order source of truth.
- Exact files involved: [`models/Order.ts`](models/Order.ts), [`app/api/orders/route.ts`](app/api/orders/route.ts) (410 stub), [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts), [`app/api/admin/daily-delivery/orders/route.ts`](app/api/admin/daily-delivery/orders/route.ts), [`app/api/admin/daily-delivery/orders/[id]/status/route.ts`](app/api/admin/daily-delivery/orders/[id]/status/route.ts). (Legacy UI artifacts were removed in Phase 2E.)
- Recommended fix direction: Select the `DailyDeliveryOrder` family as canonical, migrate consumers, and retire the older `Order` path.
- Expected benefit: One model, one lifecycle, lower regression risk.
- Implementation difficulty: High.
- Risk if left unfixed: Critical.

### 2. Make order placement and balance mutation transactional
- Problem: Order creation and entitlement mutation are still not consistently atomic.
- Why it matters: Partial failure can leave orders, balances, and transaction records out of sync.
- Exact files involved: [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts), [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts), [`models/Transaction.ts`](models/Transaction.ts), [`models/User.ts`](models/User.ts).
- Recommended fix direction: Move order placement into domain services that wrap order persistence, balance mutation, transaction creation, and audit logging in MongoDB transactions.
- Expected benefit: Correctness under retries and failure.
- Implementation difficulty: High.
- Risk if left unfixed: Critical.

### 3. Consolidate overlapping balance-mutation paths
- Problem: Credits, vouchers, and weekly balances are still mutated through several overlapping admin endpoints.
- Why it matters: Manual adjustments, refunds, and future entitlement features remain structurally fragile.
- Exact files involved: [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts), [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts), [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts), [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts), [`app/api/users/[id]/vouchers/route.ts`](app/api/users/[id]/vouchers/route.ts), [`lib/plans/balances.ts`](lib/plans/balances.ts).
- Recommended fix direction: Collapse mutation behavior behind one service-backed API pattern with consistent transaction and audit behavior.
- Expected benefit: Correct accounting behavior and simpler future plan growth.
- Implementation difficulty: High.
- Risk if left unfixed: High.

### 4. Replace route-local schema duplication in admin order flows
- Problem: Admin order routes still redefine schema structures inline.
- Why it matters: Schema drift is easy to introduce and hard to spot.
- Exact files involved: [`app/api/admin/daily-delivery/orders/route.ts`](app/api/admin/daily-delivery/orders/route.ts), [`app/api/admin/daily-delivery/orders/[id]/status/route.ts`](app/api/admin/daily-delivery/orders/[id]/status/route.ts). (Weekly admin schema ownership was addressed in Phase 2C-1.)
- Recommended fix direction: Make model files the only schema owners and import them from all route handlers.
- Expected benefit: Lower drift risk and cleaner ownership.
- Implementation difficulty: Medium.
- Risk if left unfixed: Medium to High.
- `Fact` (2026-04): **Phase 3c** removed inline Mongoose schemas from many API routes in favor of canonical `models/*` imports and shared **Zod** request/query contracts in [`lib/contracts/`](lib/contracts/). Re-audit any remaining daily-admin hotspots against this bar; item 4 is **partially** addressed at scale but **not** automatically closed for every edge route.

## Should Fix Soon

### 5. Split giant orchestration surfaces after backend contracts stabilize
- Problem: Admin, dashboard, and checkout layers still do too much orchestration in single files.
- Why it matters: These files are already beyond comfortable review and change size.
- Exact files involved: [`app/admin/page.tsx`](app/admin/page.tsx), [`app/dashboard/page.tsx`](app/dashboard/page.tsx), [`components/daily-delivery-management.tsx`](components/daily-delivery-management.tsx), [`components/weekly-subscription-management.tsx`](components/weekly-subscription-management.tsx), [`components/daily-delivery-checkout.tsx`](components/daily-delivery-checkout.tsx), [`components/weekly-subscription-checkout.tsx`](components/weekly-subscription-checkout.tsx), [`components/credit-purchase-plans.tsx`](components/credit-purchase-plans.tsx), [`components/meal-voucher-purchase.tsx`](components/meal-voucher-purchase.tsx).
- Recommended fix direction: Extract smaller domain hooks, client adapters, and presentation components after APIs stop moving.
- Expected benefit: Better developer velocity and lower regression blast radius.
- Implementation difficulty: High.
- Risk if left unfixed: High.

### 6. Standardize request validation and typed contracts
- Problem: Core flows still rely heavily on hand-written validation and loosely typed request handling.
- Why it matters: Contract drift becomes more likely as consolidation progresses.
- Exact files involved: [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts), [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts), [`app/api/users/[id]/route.ts`](app/api/users/[id]/route.ts), [`app/api/credits/request/route.ts`](app/api/credits/request/route.ts), [`app/api/voucher-requests/route.ts`](app/api/voucher-requests/route.ts).
- Recommended fix direction: Introduce shared request/response schemas and typed adapters for core business paths.
- Expected benefit: Safer refactors and clearer API contracts.
- Implementation difficulty: Medium.
- Risk if left unfixed: Medium to High.
- `Fact` (2026-04): **Phase 3c** delivered shared Zod contracts and validation helpers across most `app/api` routes; remaining gap is mainly **end-to-end typing on the client** and any stragglers found by audit.

### 7. Remove dead or conflicting framework artifacts
- Problem: The repo still contains dead or conflicting framework/security artifacts.
- Why it matters: Engineers can patch the wrong layer and misunderstand runtime truth.
- Exact files involved: [`middleware.ts`](middleware.ts), legacy order paths under [`app/api/orders`](app/api/orders) (return 410; [`lib/middleware.ts`](lib/middleware.ts) was removed in Phase 2E).
- Recommended fix direction: Remove dead middleware and fully retire superseded route families after migration.
- Expected benefit: Cleaner runtime behavior and easier maintenance.
- Implementation difficulty: Low to Medium.
- Risk if left unfixed: Medium.

## Can Wait

### 8. Modularize the email layer
- Problem: The email service remains monolithic.
- Why it matters: It is a maintainability problem, but not the top remaining correctness risk.
- Exact files involved: [`lib/services/email.ts`](lib/services/email.ts), [`lib/services/notifications.ts`](lib/services/notifications.ts).
- Recommended fix direction: Split templates and orchestration by domain after commerce flows are stabilized.
- Expected benefit: Easier maintenance and clearer ownership.
- Implementation difficulty: Medium.
- Risk if left unfixed: Medium.

### 9. Normalize client-side user-state ownership
- Problem: User state still lives across auth context, local storage, dashboard profile context, and direct refetches.
- Why it matters: It contributes to complexity but is less urgent than order and balance correctness.
- Exact files involved: [`lib/client-user-cache.ts`](lib/client-user-cache.ts), [`lib/dashboard-user-profile.tsx`](lib/dashboard-user-profile.tsx), [`lib/phone-helper.ts`](lib/phone-helper.ts), [`app/dashboard/page.tsx`](app/dashboard/page.tsx).
- Recommended fix direction: Define one canonical client-side profile source for the dashboard and reduce cache duplication.
- Expected benefit: More predictable UI state.
- Implementation difficulty: Medium.
- Risk if left unfixed: Medium.

### 10. Improve query efficiency and scaling primitives
- Problem: Some admin APIs still do avoidable extra queries, while idempotency and rate limiting are memory-backed.
- Why it matters: This matters more as deployment scale increases.
- Exact files involved: [`app/api/admin/daily-delivery/orders/route.ts`](app/api/admin/daily-delivery/orders/route.ts), [`app/api/admin/weekly-subscription/orders/route.ts`](app/api/admin/weekly-subscription/orders/route.ts), [`lib/security/rate-limit.ts`](lib/security/rate-limit.ts), [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts).
- Recommended fix direction: Remove avoidable N+1 queries and later move rate limiting/idempotency to a shared durable backend.
- Expected benefit: Better scalability and fewer multi-instance surprises.
- Implementation difficulty: Medium.
- Risk if left unfixed: Medium.

## Revised Roadmap

## Phase 1: Highest-Risk Fixes

Status: completed.

### Outcome expected from Phase 1
- Password and trust-boundary issues are closed.
- Weekly refund correctness is fixed.
- Destructive admin actions use stronger protection.
- Order-summary email generation is server-trusted.

## Phase 2A: Canonical Domain Decision And Inventory

### Goal
Define the target architecture before moving behavior.

### What should be done
1. Declare the canonical daily-order model and route family.
2. Inventory all remaining consumers of the legacy `Order` path.
3. Inventory all balance-mutation routes and their side effects.
4. Confirm the canonical weekly-order lifecycle model and the required entitlement restoration behavior.
5. Document the target end-state for daily orders, weekly orders, balance mutations, refunds, and admin consumers.

### Exact files to inspect and anchor decisions
- [`models/Order.ts`](models/Order.ts)
- [`app/api/orders/route.ts`](app/api/orders/route.ts)
- [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts)
- [`models/WeeklyOrder.ts`](models/WeeklyOrder.ts)
- [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts)
- [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts)
- [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts)
- [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts)
- [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts)
- [`app/api/users/[id]/vouchers/route.ts`](app/api/users/[id]/vouchers/route.ts)

### Order to do it in
1. Daily-order decision.
2. Consumer inventory.
3. Balance-mutation inventory.
4. Weekly-order/refund contract confirmation.
5. End-state documentation.

### Dependencies
- None. This is the enabling phase for all later Phase 2 work.

### Can be done in parallel
- Daily-order consumer inventory.
- Balance-mutation endpoint inventory.
- Weekly-order contract review.

### Verify after completion
- There is written agreement on the canonical daily-order path.
- There is a clear list of legacy consumers and mutation endpoints to migrate.
- There is a defined target for refunds and balance restoration.

### Phase 2A execution record
- `Fact`: The canonical daily-order model is [`models/DailyDeliveryOrder.ts`](models/DailyDeliveryOrder.ts).
- `Fact`: The canonical daily-order route family is [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts), [`app/api/daily-delivery/order/[id]/route.ts`](app/api/daily-delivery/order/[id]/route.ts), and the admin daily-order routes under [`app/api/admin/daily-delivery/orders`](app/api/admin/daily-delivery/orders).
- `Fact`: The legacy order route family is [`app/api/orders/route.ts`](app/api/orders/route.ts), [`app/api/orders/[id]/route.ts`](app/api/orders/[id]/route.ts), and [`app/api/users/[id]/orders/route.ts`](app/api/users/[id]/orders/route.ts), backed by [`models/Order.ts`](models/Order.ts).
- `Fact`: Active legacy order consumers found in Phase 2A include [`components/order-management.tsx`](components/order-management.tsx), [`components/order-history.tsx`](components/order-history.tsx), legacy count/stats routes under [`app/api/users/[id]`](app/api/users/[id]), [`app/api/orders/stats/route.ts`](app/api/orders/stats/route.ts), [`app/api/users/with-order-counts/route.ts`](app/api/users/with-order-counts/route.ts), [`app/api/notifications/route.ts`](app/api/notifications/route.ts), and [`lib/services/notifications.ts`](lib/services/notifications.ts).
- `Fact`: The balance-mutation routes inventoried for later consolidation are [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts), [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts), [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts), [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts), and [`app/api/users/[id]/vouchers/route.ts`](app/api/users/[id]/vouchers/route.ts), with the main admin consumer in [`app/admin/page.tsx`](app/admin/page.tsx).
- `Fact`: The repo now has an explicit order-domain contract at [`lib/orders/domain-contract.ts`](lib/orders/domain-contract.ts).
- `Fact`: The legacy order APIs now emit legacy-domain response headers so they can remain live in Phase 2A without being mistaken for canonical paths.
- `Inference`: Phase 2B can now proceed with lower ambiguity because the canonical target and the live migration surfaces are explicit.

## Phase 2B: Daily Order Consolidation

### Goal
Move the system onto one canonical daily-order domain and retire the conflicting legacy path.

### What should be done
1. Align the canonical daily-order model, route shape, and admin route expectations.
2. Migrate admin daily-order consumers off the legacy `Order` path.
3. Remove or deprecate the legacy `Order` route family after migration.
4. Ensure status updates, refunds, and customer/admin views all resolve through the canonical model.

### Exact files involved
- [`models/Order.ts`](models/Order.ts)
- [`app/api/orders/route.ts`](app/api/orders/route.ts)
- [`components/order-management.tsx`](components/order-management.tsx)
- [`app/api/daily-delivery/order/route.ts`](app/api/daily-delivery/order/route.ts)
- [`app/api/admin/daily-delivery/orders/route.ts`](app/api/admin/daily-delivery/orders/route.ts)
- [`app/api/admin/daily-delivery/orders/[id]/status/route.ts`](app/api/admin/daily-delivery/orders/[id]/status/route.ts)
- Any related daily-order admin UI consumers under [`components/`](components)

### Order to do it in
1. Canonical model alignment.
2. Admin/API migration.
3. Customer-consumer migration if still needed.
4. Legacy path retirement.

### Dependencies
- Requires Phase 2A decisions to be complete.

### Can be done in parallel
- Admin consumer migration and legacy-path retirement prep.

### Verify after completion
- Only one daily-order model and route family remain active.
- Daily admin views, status updates, refunds, and customer order reads all work off the same model.

### Phase 2B execution record
- `Fact`: Legacy compatibility components now resolve through canonical daily-order surfaces by routing [`components/order-management.tsx`](components/order-management.tsx) to [`components/view-all-orders.tsx`](components/view-all-orders.tsx) and [`components/order-history.tsx`](components/order-history.tsx) to [`components/daily-delivery-history.tsx`](components/daily-delivery-history.tsx).
- `Fact`: Live stats and count consumers that were still reading legacy daily orders now read canonical data through [`app/api/orders/stats/route.ts`](app/api/orders/stats/route.ts), [`app/api/users/[id]/orders/count/route.ts`](app/api/users/[id]/orders/count/route.ts), [`app/api/users/[id]/order-count/route.ts`](app/api/users/[id]/order-count/route.ts), [`app/api/users/[id]/daily-orders/count/route.ts`](app/api/users/[id]/daily-orders/count/route.ts), [`app/api/users/[id]/activity/route.ts`](app/api/users/[id]/activity/route.ts), and [`app/api/users/with-order-counts/route.ts`](app/api/users/with-order-counts/route.ts).
- `Fact`: The legacy user-order list route [`app/api/users/[id]/orders/route.ts`](app/api/users/[id]/orders/route.ts) now reads from [`models/DailyDeliveryOrder.ts`](models/DailyDeliveryOrder.ts) instead of [`models/Order.ts`](models/Order.ts).
- `Fact`: Legacy write entrypoints for daily orders were explicitly retired by returning `410` from [`app/api/orders/route.ts`](app/api/orders/route.ts) `POST` and [`app/api/orders/[id]/route.ts`](app/api/orders/[id]/route.ts) `PATCH`, preventing new writes from re-entering the deprecated `Order` path.
- `Inference`: Phase 2B materially reduced the chance of silent domain drift because active dashboards, counts, and compatibility surfaces now derive daily-order state from the canonical collection, while legacy write paths no longer mutate stale order data.

## Phase 2C: Weekly Order Lifecycle Cleanup

### Goal
Make weekly-order lifecycle behavior consistent and remove route-level schema duplication.

### Why this phase should be split
- `Fact`: Weekly top-up approval writes entitlement into both legacy per-plan user fields and `planBalances` in [`app/api/credits/request/admin/route.ts`](app/api/credits/request/admin/route.ts).
- `Fact`: Weekly checkout in [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts) deducts `1` weekly plan for modern meal-plan types but still stores `creditCost` as total ordered items, which means `creditCost` is not the canonical refund source for modern weekly plans.
- `Fact`: Weekly refund restoration in [`lib/orders/weekly-refund.ts`](lib/orders/weekly-refund.ts) already attempts to return the original entitlement type using `mealPlanType` and `voucherDeducted`.
- `Fact`: Admin delete behavior in [`app/api/admin/weekly-subscription/orders/[id]/route.ts`](app/api/admin/weekly-subscription/orders/[id]/route.ts) still restores raw `credits`, which can conflict with the newer weekly-plan entitlement model.
- `Fact`: Admin weekly-order routes still own local `WeeklyOrder` schemas instead of importing the canonical model from [`models/WeeklyOrder.ts`](models/WeeklyOrder.ts).
- `Inference`: Doing all of `2C` in one batch is too likely to mix storage cleanup, lifecycle normalization, and refund semantics into one risky change set.

### Exact files involved
- [`models/WeeklyOrder.ts`](models/WeeklyOrder.ts)
- [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts)
- [`app/api/admin/weekly-subscription/orders/route.ts`](app/api/admin/weekly-subscription/orders/route.ts)
- [`app/api/admin/weekly-subscription/orders/[id]/route.ts`](app/api/admin/weekly-subscription/orders/[id]/route.ts)
- [`app/api/admin/weekly-subscription/orders/[id]/status/route.ts`](app/api/admin/weekly-subscription/orders/[id]/status/route.ts)
- [`app/api/credits/request/admin/route.ts`](app/api/credits/request/admin/route.ts)
- [`lib/plans/balances.ts`](lib/plans/balances.ts)

### Dependencies
- Depends on Phase 2A target contracts.
- Safer after Phase 2B because daily-order confusion is removed first.

### Phase 2C-1: Weekly Model Ownership Cleanup
#### Goal
Make every weekly admin route read and write through the canonical `WeeklyOrder` model before changing lifecycle behavior.

#### What should be done
1. Replace inline weekly-order schemas in admin routes with imports from [`models/WeeklyOrder.ts`](models/WeeklyOrder.ts).
2. Confirm admin list/detail/delete/status routes all read the same persisted fields, including `mealPlanType`, `voucherDeducted`, and refund timestamps.
3. Preserve existing route responses while removing competing schema ownership.

#### Order to do it in
1. Route import cleanup.
2. Field-shape verification.
3. Admin read/delete smoke verification.

#### Verify after completion
- Weekly admin routes no longer define local order schemas.
- The canonical weekly model is the only schema owner for weekly orders.
- No admin weekly route silently drops `mealPlanType` or `voucherDeducted`.

#### Phase 2C-1 execution record
- `Fact`: The canonical weekly model in [`models/WeeklyOrder.ts`](models/WeeklyOrder.ts) was expanded to include admin-used lifecycle and override fields such as `confirmedAt`, `deliveredAt`, `orderCustomerOverride`, and `orderCustomerOverrideLogs`.
- `Fact`: Admin weekly routes that previously owned local schemas now import the canonical model: [`app/api/admin/weekly-subscription/orders/route.ts`](app/api/admin/weekly-subscription/orders/route.ts), [`app/api/admin/weekly-subscription/orders/[id]/route.ts`](app/api/admin/weekly-subscription/orders/[id]/route.ts), [`app/api/admin/weekly-subscription/orders/[id]/customer-info/route.ts`](app/api/admin/weekly-subscription/orders/[id]/customer-info/route.ts), [`app/api/admin/weekly-subscription/orders/delivery-dates/route.ts`](app/api/admin/weekly-subscription/orders/delivery-dates/route.ts), and [`app/api/admin/weekly-subscription/orders/export/route.ts`](app/api/admin/weekly-subscription/orders/export/route.ts).
- `Fact`: Route responses were kept behaviorally compatible while removing competing schema ownership, and the touched weekly files passed linting and local TypeScript checks.
- `Inference`: Phase 2C-2 is now safer because weekly lifecycle behavior will be normalized on top of one schema owner instead of several route-local variants.

### Phase 2C-2: Weekly Status Lifecycle Normalization
#### Goal
Make weekly status transitions consistent across admin actions and user-visible reads without changing refund logic yet.

#### What should be done
1. Standardize allowed weekly status transitions and timestamp writes.
2. Ensure admin detail/list routes and user-visible history surface the same lifecycle state.
3. Remove status-specific behavior that depends on route-local assumptions.

#### Order to do it in
1. Enumerate valid transitions.
2. Normalize timestamp updates.
3. Verify admin/user read consistency.

#### Verify after completion
- Weekly status transitions behave consistently across all admin routes.
- `confirmedAt`, `deliveredAt`, and `refundedAt` are written in one predictable way.
- Admin and user weekly views do not disagree on order state.

#### Phase 2C-2 execution record
- `Fact`: Weekly status lifecycle rules now live in [`lib/orders/weekly-status.ts`](lib/orders/weekly-status.ts), which defines valid statuses, allowed transitions, and timestamp normalization rules.
- `Fact`: The canonical admin status route [`app/api/admin/weekly-subscription/orders/[id]/status/route.ts`](app/api/admin/weekly-subscription/orders/[id]/status/route.ts) now rejects invalid transitions with explicit allowed-next-state metadata and normalizes `confirmedAt`, `deliveredAt`, and `refundedAt` consistently.
- `Fact`: The overlapping admin-only status update path in [`app/api/weekly-orders/[id]/route.ts`](app/api/weekly-orders/[id]/route.ts) no longer performs status mutations and now directs callers to the canonical admin weekly status endpoint, preventing lifecycle drift between two write surfaces.
- `Fact`: The active admin weekly UI in [`components/view-weekly-orders.tsx`](components/view-weekly-orders.tsx) now updates only successfully changed orders during batch operations and merges returned server state instead of blindly forcing local status changes.
- `Inference`: Phase 2C-3 can now focus purely on entitlement restoration correctness because weekly status state is centralized and no longer depends on duplicate lifecycle logic.

### Phase 2C-3: Weekly Refund And Entitlement Restoration Hardening
#### Goal
Guarantee that weekly refunds and admin deletions restore the same entitlement type that was originally consumed.

#### What should be done
1. Route weekly refund and delete restoration through one helper-backed entitlement rule.
2. Align legacy-credit and modern-plan behavior using `mealPlanType`, `voucherDeducted`, and `planBalances`.
3. Verify side effects on user balances, transaction behavior, and admin flows.

#### Order to do it in
1. Refund-target rule confirmation.
2. Status-route refund hardening.
3. Delete-route restoration hardening.
4. Balance verification against legacy and modern weekly plans.

#### Can be done in parallel
- Verification of top-up approval behavior can be reviewed in parallel with refund helper hardening.

#### Verify after completion
- Refunds restore the correct entitlement type consistently.
- Admin deletion does not incorrectly return raw credits for plan-based weekly orders.
- Weekly entitlement counts stay aligned between legacy fields and `planBalances`.

#### Phase 2C-3 execution record
- `Fact`: Weekly entitlement restoration semantics now live in [`lib/orders/weekly-refund.ts`](lib/orders/weekly-refund.ts), which exports a shared refund-target resolver, mutation helper, and human-readable restoration summary for admin flows.
- `Fact`: The canonical weekly status mutation route [`app/api/admin/weekly-subscription/orders/[id]/status/route.ts`](app/api/admin/weekly-subscription/orders/[id]/status/route.ts) now computes refund targets up front and applies balance restoration plus order-status mutation inside one MongoDB transaction, preventing partial "user refunded but order not marked refunded" failures.
- `Fact`: The admin weekly delete route [`app/api/admin/weekly-subscription/orders/[id]/route.ts`](app/api/admin/weekly-subscription/orders/[id]/route.ts) no longer blindly restores raw `credits`; it now restores the original entitlement type through the shared helper and deletes the order in the same transaction.
- `Fact`: The admin weekly UI [`components/view-weekly-orders.tsx`](components/view-weekly-orders.tsx) now describes delete-time restoration as "weekly voucher / credits" and surfaces refund summaries from the server so operators can distinguish voucher restoration from legacy-credit restoration.
- `Fact`: Targeted lint checks passed for the edited files. `npx tsc --noEmit` still reports pre-existing unrelated route-context typing failures elsewhere in the repo and did not report new errors for the touched weekly refund files.
- `Inference`: Phase 2D can now focus on broader mutation-service consolidation because the highest-risk weekly refund/delete mismatch has been removed from the active weekly admin paths.

## Phase 2D: Balance Mutation Consolidation

### Goal
Create one coherent entitlement mutation model across admin adjustments, purchases, and refunds.

### What should be done
1. Design a single balance-mutation service API.
2. Route credits, vouchers, and weekly-plan mutations through that service.
3. Standardize audit logging and transaction-record creation.
4. Remove redundant mutation endpoints after migration.

### Exact files involved
- [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts)
- [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts)
- [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts)
- [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts)
- [`app/api/users/[id]/vouchers/route.ts`](app/api/users/[id]/vouchers/route.ts)
- [`lib/plans/balances.ts`](lib/plans/balances.ts)
- [`models/Transaction.ts`](models/Transaction.ts)
- [`lib/security/audit.ts`](lib/security/audit.ts)

### Order to do it in
1. Service design.
2. Credits migration.
3. Voucher and weekly-plan migration.
4. Refund/manual-adjustment integration.
5. Redundant endpoint retirement.

### Dependencies
- Depends on Phase 2B and 2C because refund and order domains need stable behavior first.

### Can be done in parallel
- Audit/transaction normalization can be prepared in parallel with service design.

### Verify after completion
- Manual admin changes, purchases, and refunds all mutate balances through one service.
- Audit and transaction behavior is consistent across mutation types.

#### Phase 2D execution record
- `Fact`: A new shared mutation service now exists in [`lib/balances/mutations.ts`](lib/balances/mutations.ts), centralizing supported balance fields, insufficiency checks, transaction creation, safe user lookup, audit integration, and user-response sanitization.
- `Fact`: Weekly compatibility balance syncing in [`lib/plans/balances.ts`](lib/plans/balances.ts) was hardened so weekly plan mutations keep legacy fields and `planBalances` aligned instead of incrementing a missing `planBalances` entry from zero.
- `Fact`: Audit logging in [`lib/security/audit.ts`](lib/security/audit.ts) now supports MongoDB sessions, allowing balance mutations and audit rows to be written within the same transaction boundary.
- `Fact`: Admin mutation endpoints [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts), [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts), [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts), and [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts) now route their writes through the shared service instead of owning separate balance-mutation logic.
- `Fact`: Purchase approval flows in [`app/api/credits/request/admin/route.ts`](app/api/credits/request/admin/route.ts) and [`app/api/voucher-requests/[requestId]/route.ts`](app/api/voucher-requests/[requestId]/route.ts) now use the same mutation service for credits, daily vouchers, and weekly-plan entitlement grants, while keeping their existing API responses and compatibility URLs.
- `Fact`: Targeted lint checks passed for all touched files. `npx tsc --noEmit` still reports unrelated pre-existing route-context typing failures elsewhere in the repo and no longer reports errors in the touched 2D files.
- `Inference`: Phase 2E can now focus on consumer cleanup because the highest-risk mutation drift has been reduced at the service layer even where legacy URLs remain for compatibility.

## Phase 2E: Consumer Cleanup And Dead-Path Removal

### Goal
Remove remaining dependency on superseded APIs and reduce structural confusion.

### What should be done
1. Update admin and dashboard consumers to use only canonical APIs.
2. Remove dead order paths and retired helpers.
3. Remove dead middleware or stale framework artifacts.
4. Re-check that no old paths remain wired into live UI.

### Exact files involved
- [`app/admin/page.tsx`](app/admin/page.tsx)
- [`app/dashboard/page.tsx`](app/dashboard/page.tsx)
- [`components/order-management.tsx`](components/order-management.tsx)
- [`middleware.ts`](middleware.ts)
- [`lib/middleware.ts`](lib/middleware.ts)
- Any remaining legacy consumers under [`components/`](components) and [`app/api/orders`](app/api/orders)

### Order to do it in
1. Consumer migration.
2. Dead-path removal.
3. Middleware/framework cleanup.
4. Final dependency sweep.

### Dependencies
- Depends on 2B, 2C, and 2D being complete.

### Can be done in parallel
- UI consumer cleanup and dead-artifact inventory.

### Verify after completion
- No live UI depends on superseded order or balance APIs.
- Dead middleware and retired paths are removed or clearly archived.

#### Phase 2E execution record
- `Fact`: The live admin consumer in [`app/admin/page.tsx`](app/admin/page.tsx) now uses the canonical balance mutation endpoint [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts) for both credit additions and credit deductions instead of calling separate compatibility routes.
- `Fact`: The canonical balance mutation route now returns transaction metadata alongside the sanitized user response, which preserves the existing credit-added notification behavior while keeping the UI on one mutation API.
- `Fact`: Compatibility balance routes [`app/api/users/[id]/credits/route.ts`](app/api/users/[id]/credits/route.ts), [`app/api/users/[id]/add-credits/route.ts`](app/api/users/[id]/add-credits/route.ts), and [`app/api/users/[id]/deduct-credits/route.ts`](app/api/users/[id]/deduct-credits/route.ts) were retired with explicit `410` responses pointing callers to [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts).
- `Fact`: Legacy order read paths [`app/api/orders/route.ts`](app/api/orders/route.ts), [`app/api/orders/[id]/route.ts`](app/api/orders/[id]/route.ts), and [`app/api/users/[id]/orders/route.ts`](app/api/users/[id]/orders/route.ts) were retired with `410` responses that direct callers to canonical daily-delivery endpoints.
- `Fact`: Dead compatibility artifacts [`components/order-management.tsx`](components/order-management.tsx), [`components/order-history.tsx`](components/order-history.tsx), and [`lib/middleware.ts`](lib/middleware.ts) were removed, and the stale commented order-management block was removed from [`app/admin/page.tsx`](app/admin/page.tsx).
- `Fact`: [`middleware.ts`](middleware.ts) no longer treats the retired `/api/orders` family as an active authenticated API prefix.
- `Fact`: Targeted lint checks passed. `npx tsc --noEmit` still reports unrelated pre-existing route-context/type issues elsewhere in the repo and did not report new errors for the touched 2E files.
- `Inference`: Phase 3 can now focus on structural maintainability work without carrying the extra ambiguity of compatibility wrappers and split consumer paths inside Phase 2.

## Post-Phase 2E: Weekly-Domain Refinements

### Summary
Work completed after Phase 2E to simplify weekly split-order modeling, fix display conflation, improve admin traceability, and make child-order cancellation status-only.

#### Weekly split-order parent-child entitlement model
- `Fact`: A new parent model [`models/WeeklyEntitlementGroup.ts`](models/WeeklyEntitlementGroup.ts) was added to represent one weekly voucher usage for a week.
- `Fact`: Child [`WeeklyOrder`](models/WeeklyOrder.ts) documents now store `weeklyEntitlementGroupId` and `allocatedMealCount` for new split checkouts.
- `Fact`: Split weekly checkout in [`components/weekly-subscription-checkout.tsx`](components/weekly-subscription-checkout.tsx) generates a stable group ID and passes it to all child-order writes via [`app/api/weekly-subscription/user/route.ts`](app/api/weekly-subscription/user/route.ts).
- `Fact`: Historical weekly orders remain unchanged; no backfill. UI fallback uses `mealPlanType` then legacy `creditCost` for old records.
- `Inference`: The root conflation of child meal count with weekly voucher identity is fixed for new split orders.

#### Weekly customer/admin display fixes
- `Fact`: [`lib/orders/weekly-entitlement-display.ts`](lib/orders/weekly-entitlement-display.ts) centralizes voucher vs. meal-count display semantics.
- `Fact`: Customer history [`components/weekly-subscription-history.tsx`](components/weekly-subscription-history.tsx) and detail APIs ([`app/api/weekly-subscription/user/history/route.ts`](app/api/weekly-subscription/user/history/route.ts), [`app/api/weekly-orders/[id]/route.ts`](app/api/weekly-orders/[id]/route.ts)) now return `weeklyEntitlementSummary`; UI renders parent voucher meaning and child allocated meals separately.
- `Fact`: Admin detail modal in [`components/view-weekly-orders.tsx`](components/view-weekly-orders.tsx) was updated to show "Weekly Voucher Used" and "Allocated Meals For This Delivery" instead of misleading "Credit Cost" for split child orders.
- `Fact`: Admin detail API [`app/api/admin/weekly-subscription/orders/[id]/route.ts`](app/api/admin/weekly-subscription/orders/[id]/route.ts) attaches `weeklyEntitlementSummary` and `linkedWeeklyGroup` for traceability.

#### Admin linked-weekly-group traceability
- `Fact`: Admin detail API returns `linkedWeeklyGroup` (groupId, linkedChildOrderCount, otherLinkedChildOrders) when `weeklyEntitlementGroupId` exists.
- `Fact`: Admin weekly order list search in [`app/api/admin/weekly-subscription/orders/route.ts`](app/api/admin/weekly-subscription/orders/route.ts) now includes `weeklyEntitlementGroupId`, so admins can paste the group ID into the search bar to find linked child orders.
- `Fact`: Admin modal shows an admin-only "Linked Weekly Group" section with copyable group ID and sibling order list.
- `Inference`: Operators can trace split weekly child orders without manual correlation.

#### Weekly child-order status simplification
- `Fact`: [`lib/orders/weekly-status.ts`](lib/orders/weekly-status.ts) now distinguishes `WEEKLY_OPERATOR_ORDER_STATUSES` (pending, confirmed, delivery, delivered, cancelled) from full stored statuses; `refunded` is no longer an allowed operator transition for weekly child orders.
- `Fact`: Admin weekly status API [`app/api/admin/weekly-subscription/orders/[id]/status/route.ts`](app/api/admin/weekly-subscription/orders/[id]/status/route.ts) no longer performs automatic entitlement restoration on status change; it is a pure status-update route.
- `Fact`: "Mark as Refunded" and "Refunded" batch option were removed from weekly admin UI in [`components/view-weekly-orders.tsx`](components/view-weekly-orders.tsx).
- `Fact`: Weekly child-order cancellation is now a fulfillment status change only. Partial cancellation is handled by human support; no automatic refund/restoration from child-order status changes.
- `Fact`: Exceptional manual refund/delete path (delete with `returnCredits=true`) remains unchanged and separate from normal status flow.

#### Assumptions now outdated
- The original "Must Fix Now" item 4 listed admin weekly schema duplication; Phase 2C-1 already addressed weekly admin route schema ownership. Item 4 now applies primarily to daily-order admin routes.
- The original "Especially dangerous" verdict referred to Phase 2B/2C/2D/2E as incomplete; all are now complete for their intended scope.

## Phase 3: Maintainability Improvements

### Goal
Reduce change risk by shrinking orchestration layers and standardizing contracts.

### Reassessment (post–Phase 2E and weekly refinements)
- `Fact`: Phase 2B through 2E are complete. Post-Phase 2E weekly refinements are complete. Backend contracts for orders, balances, and weekly lifecycle are materially stable.
- `Fact` (2026-04): **Phase 3b** (admin decomposition) and **Phase 3c** (API contracts + route migration) are complete; **Phase 3b cleanup** (shared date formatting) is complete.
- `Inference`: Remaining Phase 3 work is **dashboard** and **checkout/management** extraction plus **client** alignment with contracts where still hand-rolled; weekly domain is not blocking this.

### What should be done
1. ~~Split [`app/admin/page.tsx`](app/admin/page.tsx) into smaller domain composition layers (highest impact first).~~ **Done (Phase 3b).**
2. Split [`app/dashboard/page.tsx`](app/dashboard/page.tsx) into clearer slices.
3. Extract shared hooks, client adapters, and view components from the large checkout and management files.
4. ~~Standardize request schemas and typed route contracts~~ **Done at the API layer (Phase 3c).** Optional follow-up: align more **client** fetchers and UI types with [`lib/contracts/`](lib/contracts/).

### Recommended Phase 3 implementation order
1. ~~Admin-page decomposition~~ **Done.**
2. Dashboard decomposition (profile, order history, subscription views).
3. ~~Shared schema adoption for APIs~~ **Done (`lib/contracts` + `lib/api`).** Extend to clients as needed.
4. Checkout and management component extraction (after dashboard is split or in parallel where isolated).

### Dependencies
- Phase 2B through 2E are complete. Backend contracts are stable enough for Phase 3.

### Can be done in parallel
- Admin-page domain slices (if scoped to non-overlapping sections).
- Dashboard slices.
- Shared schema definitions (can precede decomposition).

### Verify after completion
- The largest controller-style files have reduced scope.
- Client flows depend on typed shared contracts instead of hand-built fetch shapes.

### Phase 3b execution record (admin decomposition)
- `Fact`: Admin order and daily-menu UI were decomposed into `features/admin-daily-orders`, `features/admin-weekly-orders`, `features/admin-daily-menu`, and shared `components/admin-orders` with `lib/types/orders.ts`. Legacy `view-all-orders`, `view-weekly-orders`, and `daily-delivery-management` became thin re-exports where applicable.
- `Fact`: Admin tab shell uses lazy-loaded feature modules from `features/admin-page/admin-dashboard-tab-content.tsx` to reduce initial bundle and clarify boundaries.

### Phase 3c execution record (typed API contracts)
- `Fact`: Shared helpers live under [`lib/api/`](lib/api/) (`successJson`, `errorJson`, `handleRouteError`, Zod-backed `parseJsonBody` / `parseSearchParams`, `AuthenticatedActor` typing).
- `Fact`: Domain Zod schemas live under [`lib/contracts/`](lib/contracts/) with a barrel export; many routes in [`app/api/`](app/api/) were migrated while preserving legacy JSON response shapes where clients depend on them.
- `Inference`: Full-repo `tsc` clean is still a separate goal; isolated checks were used during migration. Phase 4 tests will lock behavior as types are tightened further.

### Phase 3b cleanup execution record (formatting)
- `Fact`: [`lib/format.ts`](lib/format.ts) `formatDate` / `formatDateTime` accept optional `locale` and `Intl.DateTimeFormatOptions` so en/zh history views can share Toronto timezone defaults without duplicating `toLocaleDateString` blocks.
- `Fact`: Migrated components include meal voucher admin, unified recharge history, credit/voucher purchase history, weekly subscription history, and daily delivery history.

## Phase 4: Test Coverage And Hardening

### Goal
Protect the cleaned foundation with meaningful automated regression coverage.

### What should be done
1. Add integration tests for login, password change, admin MFA enforcement, and profile mutation boundaries.
2. Add integration tests for daily orders, weekly orders, refunds, and manual balance adjustments.
3. Add regression tests for balance compatibility logic in [`lib/plans/balances.ts`](lib/plans/balances.ts).
4. Add smoke coverage for canonical admin order and checkout flows.

### Dependencies
- Tests should target the canonical routes and services established by Phase 2.

### Can be done in parallel
- Auth/account tests.
- Order/refund tests.
- Balance regression tests.

### Verify after completion
- High-risk business flows are protected before major new core-commerce work resumes.

### Phase 4 execution record
- `Fact`: A new Vitest-based test harness is in place via [`vitest.config.ts`](vitest.config.ts), root `package.json` test scripts, and shared helpers under [`__tests__/helpers/`](__tests__/helpers/).
- `Fact`: Regression coverage now protects pure balance and pricing logic in [`__tests__/unit/balances.test.ts`](__tests__/unit/balances.test.ts), [`__tests__/unit/weekly-status.test.ts`](__tests__/unit/weekly-status.test.ts), [`__tests__/unit/weekly-refund.test.ts`](__tests__/unit/weekly-refund.test.ts), and [`__tests__/unit/promo-code-shared.test.ts`](__tests__/unit/promo-code-shared.test.ts).
- `Fact`: Integration coverage now exercises the shared balance mutation service, auth guard boundaries, canonical daily/weekly order routes, and the admin balance update route via [`__tests__/integration/balance-mutations.test.ts`](__tests__/integration/balance-mutations.test.ts), [`__tests__/integration/auth-guards.test.ts`](__tests__/integration/auth-guards.test.ts), [`__tests__/integration/daily-order-route.test.ts`](__tests__/integration/daily-order-route.test.ts), [`__tests__/integration/weekly-order-route.test.ts`](__tests__/integration/weekly-order-route.test.ts), and [`__tests__/integration/admin-balance-route.test.ts`](__tests__/integration/admin-balance-route.test.ts).
- `Fact`: The shared in-memory Mongo test database now runs as a replica set in [`__tests__/helpers/db.ts`](__tests__/helpers/db.ts), allowing transaction-backed routes like [`app/api/users/[id]/update-balance/route.ts`](app/api/users/[id]/update-balance/route.ts) to be tested under realistic conditions.
- `Fact`: `npm test` passes with 84 tests. `npx tsc --noEmit` still reports pre-existing repo-wide TypeScript errors outside the new test files. `npm run lint` cannot complete yet because the repository does not have a configured ESLint setup and `next lint` prompts for initial configuration.

## Build Readiness Verdict

### Safe to build now
- Plan catalog additions that stay inside [`lib/plans/catalog.ts`](lib/plans/catalog.ts) and [`lib/plans/service.ts`](lib/plans/service.ts).
- Small promo-rule enhancements in [`lib/promo-code.ts`](lib/promo-code.ts).
- Isolated admin/settings work in [`app/api/settings/route.ts`](app/api/settings/route.ts) and [`models/Settings.ts`](models/Settings.ts).
- Small UI improvements that do not change order, refund, balance, or auth contracts.

### Should wait until foundation work is complete
- New order types.
- New refund and cancellation behavior.
- New voucher, credit, or entitlement models.
- Major checkout redesign tied to backend-contract changes.
- New core-commerce features that touch orders, subscriptions, credits, vouchers, approvals, or proofs of payment.

### Especially dangerous right now
- Phase 2B, 2C, 2D, and 2E are complete. The prior "before Phase 2X is complete" warnings no longer apply.
- Remaining high-risk areas: changes to daily-order canonical path (Must Fix #1) before consolidation; changes to order placement or balance mutation without transactions (Must Fix #2); new manual-balance tooling that bypasses the consolidated update-balance service.

## Recommended First Implementation Batch

### Next step: Finish remaining Phase 3 + Phase 4
- **Remaining Phase 3**: Further decomposition of [`app/dashboard/page.tsx`](app/dashboard/page.tsx) and optional extraction from large checkout/management components ([`components/weekly-subscription-checkout.tsx`](components/weekly-subscription-checkout.tsx), [`components/daily-delivery-checkout.tsx`](components/daily-delivery-checkout.tsx), etc.) if still monolithic.
- **Phase 4**: Add integration coverage for auth boundaries, daily/weekly orders, refunds, and balance mutations against canonical routes/services.
- Admin decomposition and API contract layer are **already in place**; weekly domain remains stable.

### Before any major new core-commerce feature work
- Phase 2B through 2E are complete.
- Phase 4 must provide regression coverage for orders, refunds, and balance mutation before high-risk expansion.
- Must Fix items 1–4 remain for correctness and maintainability; Phase 3 does not block them but reduces risk when addressing them.

## Confidence And Risk View
- `Fact`: The remaining work is concentrated in the most coupled domains in the repo.
- `Inference`: Doing all of old Phase 2 in one implementation batch would be high risk.
- `Inference`: Breaking Phase 2 into 2A, 2B, 2C, 2D, and 2E is the safer path and gives cleaner rollback and verification points.
- Confidence to execute each smaller phase safely:
- `High` for Phase 2A.
- `Medium` for Phase 2B by itself.
- `High` for Phase 2C-1 by itself.
- `Medium` for Phase 2C-2 by itself.
- `Medium` for Phase 2C-3 by itself.
- `Medium-low` for Phase 2D if attempted together with 2B or 2C.
- `High` for 2E after the earlier subphases are done.

## Prioritized Checklist
- [x] Finish Phase 1 high-risk hardening.
- [x] Complete Phase 2A canonical-domain decision and inventory.
- [x] Complete Phase 2B daily-order consolidation.
- [x] Complete Phase 2C-1 weekly-order model ownership cleanup.
- [x] Complete Phase 2C-2 weekly-status lifecycle normalization.
- [x] Complete Phase 2C-3 weekly refund and entitlement restoration hardening.
- [x] Complete Phase 2D balance-mutation consolidation.
- [x] Complete Phase 2E consumer cleanup and dead-path removal.
- [x] Post-Phase 2E weekly refinements (split parent-child, display, traceability, status-only cancellation).
- [x] Phase 3b: Admin-page decomposition (feature slices, lazy tabs, `components/admin-orders`, `lib/types/orders.ts`).
- [x] Phase 3c: Standardize shared request/response schemas and API validation (`lib/api`, `lib/contracts`, `app/api` migration).
- [x] Phase 3b cleanup: Dedupe dashboard/history date formatting via [`lib/format.ts`](lib/format.ts).
- [x] Phase 3 (remaining): Further split [`app/dashboard/page.tsx`](app/dashboard/page.tsx) and extract checkout/management orchestration as needed.
- [x] Add integration coverage for auth, orders, refunds, and balance correctness (Phase 4).
- [ ] Optional: delete 410-stub route files under `app/api/orders` once no external callers remain (Phase 2E retired paths and removed `lib/middleware.ts`).
- [ ] Must Fix #1–4: Track to closure (daily canonical completeness, transactional order+balance writes, balance-path consolidation, any remaining schema drift).

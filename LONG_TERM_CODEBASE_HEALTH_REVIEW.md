# Long-Term Codebase Health Review

Date: 2026-03-11

Scope reviewed: auth, middleware, user/account APIs, plans and balances, payments/request flows, daily orders, weekly subscriptions, admin operations, checkout flows, email/notification layer, and the largest client/admin surfaces.

How to read this report:
- `Fact`: directly observed in code.
- `Inference`: engineering judgment based on the observed structure.

## 1. Overall Codebase Health

Verdict at a high level: `workable but should fix several structural issues first`.

Facts:
- The codebase has some real structure in important areas: `lib/auth/guards.ts`, `lib/auth/session.ts`, `middleware.ts`, `lib/plans/catalog.ts`, `lib/plans/service.ts`, `lib/plans/balances.ts`, `lib/promo-code.ts`, `lib/price-breakdown.ts`, and `lib/constants/areas.ts` are meaningful attempts at centralization.
- The system also contains very large orchestration files: `app/admin/page.tsx` (~4383 lines), `components/daily-delivery-management.tsx` (~4185), `app/dashboard/page.tsx` (~2634), `components/weekly-subscription-management.tsx` (~1976), `components/meal-voucher-purchase.tsx` (~1821), `components/credit-purchase-plans.tsx` (~1438), and `lib/services/email.ts` (~2674).
- There are multiple parallel implementations of similar business domains, especially around orders, balances, and admin operations.
- I did not find a normal automated unit/integration test suite. `package.json` has `lint` and `test:security`, and the repo has ad hoc script-style tests under `scripts/`, but not a real safety net around core flows.

Inference:
- This is not a codebase in collapse, but it is already carrying enough duplication, legacy overlap, and oversized coordination files that healthy feature growth will get slower and riskier unless the core flows are consolidated first.

## 2. Architecture Health

Facts:
- The top-level separation is recognizable: pages/components in `app/` and `components/`, database models in `models/`, auth in `auth.ts` and `lib/auth/*`, settings access in `lib/settings-access.ts`, and business helpers in `lib/*`.
- Some domains are cleanly centralized. Plan definitions are stronger than average because `lib/plans/catalog.ts` is paired with `lib/plans/service.ts` and `lib/plans/balances.ts`.
- Promo pricing logic is also reasonably centralized in `lib/promo-code.ts` and `lib/price-breakdown.ts`.
- The architecture breaks down in execution layers. Large client components do too much orchestration, and many API routes still hold important business rules inline.
- Several admin order routes define their own Mongoose schemas inside route files instead of importing canonical models: `app/api/admin/daily-delivery/orders/route.ts`, `app/api/admin/daily-delivery/orders/[id]/status/route.ts`, `app/api/admin/weekly-subscription/orders/route.ts`, `app/api/admin/weekly-subscription/orders/[id]/status/route.ts`.
- There are two middleware files, `middleware.ts` and `lib/middleware.ts`, with overlapping but different behavior. Only the root `middleware.ts` is the actual Next.js middleware entrypoint.

Inference:
- The codebase has a decent folder layout, but the actual runtime architecture is not consistently enforced. It looks like the system evolved by adding new vertical slices while leaving earlier slices in place, so the directory structure looks cleaner than the domain boundaries really are.

Architectural weakness that will cause pain:
- Too much business logic still lives in route handlers and giant client components instead of stable domain services.
- The same domain is represented by multiple APIs, multiple schemas, and multiple UI flows.
- There is no strong anti-entropy mechanism preventing old implementations from remaining active beside newer ones.

## 3. Single Source Of Truth And Business Logic Integrity

What is centralized well:
- Plans: `lib/plans/catalog.ts`, `lib/plans/service.ts`, `lib/plans/balances.ts`.
- Areas: `lib/constants/areas.ts`.
- Promo logic: `lib/promo-code.ts`.
- Settings allowlist rules: `lib/settings-access.ts`.

Where the source of truth is fractured:
- User entitlements exist in both legacy numeric fields on `models/User.ts` (`weeklySIXmeals`, `weeklyEIGHTmeals`, etc.) and the newer `planBalances` map. `lib/plans/balances.ts` tries to bridge both worlds, which is useful, but it also proves the system is carrying two truth models at once.
- Balance mutation is split across multiple overlapping routes: `app/api/users/[id]/add-credits/route.ts`, `app/api/users/[id]/deduct-credits/route.ts`, `app/api/users/[id]/credits/route.ts`, `app/api/users/[id]/update-balance/route.ts`, `app/api/users/[id]/vouchers/route.ts`.
- Daily order logic has competing implementations. `models/Order.ts` defines one structure, `app/api/orders/route.ts` expects another, and `app/api/daily-delivery/order/route.ts` uses `DailyDeliveryOrder` with a third shape.
- Weekly order lifecycle logic is split across `models/WeeklyOrder.ts`, `app/api/weekly-subscription/user/route.ts`, and admin weekly order routes that redefine schema details inline.
- Email summaries are not built from canonical persisted orders in `app/api/send-order-summary-email/route.ts`; the server accepts `orders`, `deliveryAddress`, `area`, `phoneNumber`, and `specialInstructions` from the request body and sends emails from that payload.

Concrete competing-source example:
- `models/Order.ts` contains `items` and `totalVouchers`.
- `app/api/orders/route.ts` creates orders with `orderId`, `selectedMeals`, `creditCost`, `deliveryAddress`, and `phoneNumber`, and calls `Order.generateOrderId()`, which does not exist on `models/Order.ts`.
- `components/order-management.tsx` is built around `/api/orders`, so this is not just dead text; it is a parallel path with a mismatched contract.

Inference:
- The plan catalog is trending toward a healthy source of truth. Orders, balances, and account mutation are not. Those domains need consolidation before more major features are added.

What should be centralized next:
- Order creation, refund, status transitions, and email payload generation.
- All balance/entitlement mutations behind one domain service.
- User profile mutation rules, especially password and email changes.
- Canonical order and transaction schemas with no inline route-level redefinitions.

## 4. Coupling, Fragility, And Change Risk

Facts:
- `app/admin/page.tsx` is acting like a super-controller for many admin domains at once.
- `app/dashboard/page.tsx` is the same on the customer side.
- Checkout components such as `components/daily-delivery-checkout.tsx`, `components/weekly-subscription-checkout.tsx`, `components/credit-purchase-plans.tsx`, and `components/meal-voucher-purchase.tsx` each combine UI workflow, validation, API choreography, local state, uploads, and error handling.
- `lib/utils.ts` is a mixed layer containing UI helpers and client-side fetch/update helpers, which makes it a catch-all rather than a clean domain boundary.
- `lib/services/email.ts` is effectively a notification monolith.

Fragile areas:
- Order lifecycle changes.
- Refund and entitlement restoration.
- User/account mutation.
- Any feature that touches both admin tools and customer flows.
- Anything that adds a new plan type or payment/request path without carefully walking every legacy branch.

Inference:
- This codebase is tightly coupled around a handful of giant coordination files. Small changes to order payload shape, balance shape, or user profile shape are likely to cause regressions in several distant places because the dependencies are informal rather than enforced.

## 5. Maintainability And Developer Experience

Facts:
- The repo contains many oversized files that are difficult to review safely.
- There is heavy use of `any`, broad `Record<string, any>`, and manual object mutation in critical flows.
- Validation is mostly hand-written inside route handlers instead of consistently using shared schemas.
- Debug logging is very noisy in several production routes, for example `app/api/weekly-subscription/user/route.ts`, `app/api/daily-delivery/order/route.ts`, and balance mutation routes.
- Naming is inconsistent across similar concepts: `credits`, `weeklySIXmeals`, `planBalances`, `twoDishVoucher`, `threeDishVoucher`, `debit`, `Deduct`, `refund`.
- I found both current and legacy admin/order UIs kept side by side in `app/admin/page.tsx`.

Inference:
- The code is modifiable, but not easily understandable. Future engineers will spend too much time rediscovering which path is current, which path is legacy-but-still-wired, and which fields are canonical.

What slows future development:
- Giant stateful client files.
- Lack of shared validation and domain services.
- Overlapping endpoints.
- Mixed legacy/current data models.
- Sparse automated test coverage for risky flows.

## 6. Auth, Permissions, And Trust Boundaries

What is structurally good:
- `lib/auth/guards.ts` is a good foundation.
- `middleware.ts` enforces auth and admin MFA boundaries at the edge for many routes.
- `lib/auth/session.ts` and session versioning reduce stale-session risk.
- `app/api/auth/admin-mfa/route.ts` and signed admin MFA cookies are strong signs of deliberate security work.
- `app/api/email/route.ts` being deprecated with `410` is a good call; it avoids a generic email-sending surface.

Major weaknesses:
- `app/api/users/[id]/route.ts` lets a logged-in user PATCH their own `password` without supplying the current password. There is a dedicated `change-password` route that does require `currentPassword`, but the generic PATCH route bypasses that protection.
- The same generic user PATCH route allows self-service email mutation with no visible re-verification path in that flow.
- `app/api/users/[id]/route.ts` DELETE uses `requireAdmin()` rather than `requireAdminMfa()`, even though it is a destructive admin operation.
- `app/api/send-order-summary-email/route.ts` trusts client-supplied `orders`, `deliveryAddress`, `area`, `phoneNumber`, and `specialInstructions` instead of rebuilding the email from canonical persisted records.
- The system depends on both route guards and middleware path lists for security posture. That is useful defense in depth, but it also creates drift risk when new routes are added and one layer is forgotten.

Inference:
- The auth foundation is better than the rest of the system, but some trust-boundary mistakes remain in exactly the places that tend to become expensive security incidents later: password change, admin destructive actions, and client-authored business communication.

## 7. Data Flow And State Management Health

Facts:
- Customer and admin state are heavily local-state driven inside giant client components.
- User data is also cached in `localStorage` via `lib/client-user-cache.ts`, while auth state comes from `lib/client-auth`, while dashboard profile state is also carried through `lib/dashboard-user-profile.tsx`, while some flows fetch fresh user data again during checkout.
- Checkout flows frequently fetch data just-in-time to compensate for stale client state.
- `components/order-management.tsx` and newer admin order components use different APIs for similar jobs.

Inference:
- State ownership is not clear. The app is already compensating for stale or ambiguous client state by adding more fetches and more reconciliation logic. That pattern usually gets worse with every feature because there is no single predictable ownership model.

What will get worse as features expand:
- Profile data consistency.
- Balance display vs actual deduct/refund state.
- Admin/customer views disagreeing on current order shape.
- Checkout edge cases caused by stale cached user objects.

## 8. Performance And Scaling Readiness

Facts:
- Many major pages are very large client components, which will increase bundle weight and hydration cost.
- `app/api/admin/daily-delivery/orders/route.ts` and `app/api/admin/weekly-subscription/orders/route.ts` both populate `userId` and then still run an additional `User.findById(...)` per order inside `Promise.all`, which creates unnecessary extra queries.
- `lib/security/rate-limit.ts` is in-memory.
- `app/api/daily-delivery/order/route.ts` uses an in-memory idempotency store.
- `lib/services/email.ts` is large and centralized enough to become a throughput and maintenance bottleneck.
- There are some positive signs: `app/api/users/with-order-counts/route.ts` uses aggregation to avoid obvious N+1 counting.

Inference:
- The codebase can handle current small-to-moderate load patterns, but it is not ready for confident multi-instance or high-throughput growth in critical areas. In-memory safety mechanisms and repeated extra queries will age poorly.

Patterns that matter long term:
- Large client bundles.
- No durable distributed idempotency/rate-limit strategy.
- Repeated fetch/reconciliation behavior in checkout.
- Re-querying user records per order in admin lists.

## 9. Product And Feature Expansion Readiness

What the codebase is reasonably prepared for:
- Adding or changing plan options, if the team continues using `lib/plans/catalog.ts` and related helpers.
- Extending promo code rules.
- Adding straightforward admin settings.
- Small auth/session hardening changes.

What will be risky without foundation work first:
- Any new order type.
- New refund, cancellation, or rebooking rules.
- New entitlement types beyond current credits/vouchers/weekly plans.
- New payment flows.
- New admin tools that need consistent order/customer state.
- Any feature that relies on a guaranteed audit trail or exact financial/accounting correctness.

Inference:
- The codebase can still ship features, but safe expansion is domain-dependent. Marketing, plan catalog, and light admin improvements are fine. Core commerce and entitlement features are where structural weaknesses will compound fastest.

## 10. System-Critical Files And Refactor Priorities

Most important files/layers:
- `models/User.ts`: central because balances, auth-related fields, legacy plan fields, and account profile live here.
- `app/api/daily-delivery/order/route.ts` and `app/api/weekly-subscription/user/route.ts`: central because they persist orders and mutate entitlements.
- `app/api/orders/route.ts` and `models/Order.ts`: central because they reveal a conflicting older order system that is still wired into admin UI.
- `app/api/admin/daily-delivery/orders/*` and `app/api/admin/weekly-subscription/orders/*`: central because they define operational truth for admins, including refunds/status updates.
- `lib/plans/*`: central because this is one of the few healthier business-rule centers.
- `lib/services/email.ts` and `app/api/send-order-summary-email/route.ts`: central because they control customer/admin communication around purchases.
- `app/admin/page.tsx` and `app/dashboard/page.tsx`: central because they are the main coordination surfaces and likely regression hotspots.

Top refactor priorities:
1. Unify the order domain.
Why it matters: there should be one canonical daily order model and one canonical weekly order model, with one creation path and one admin lifecycle path.

2. Unify entitlement mutation.
Why it matters: credits, vouchers, weekly plan balances, and refunds should move through one service layer with transactions and audit logging.

3. Split giant client controllers.
Why it matters: `app/admin/page.tsx`, `app/dashboard/page.tsx`, and major checkout/management components are too large to evolve safely.

4. Standardize request validation.
Why it matters: critical APIs currently rely on ad hoc manual validation and inconsistent payload contracts.

5. Remove dead and conflicting implementations.
Why it matters: keeping both old and new flows alive is one of the biggest entropy drivers in this repo.

6. Add automated tests around purchase/refund/account security flows.
Why it matters: this codebase no longer has enough structural simplicity to rely on manual confidence alone.

## 11. Top Risks Before Expanding The System

### 1. Competing daily-order systems with mismatched schema contracts
- Severity: `critical`
- Why it matters: the system does not have one trustworthy daily-order model.
- Files involved: `models/Order.ts`, `app/api/orders/route.ts`, `components/order-management.tsx`, `app/api/daily-delivery/order/route.ts`, `app/api/admin/daily-delivery/orders/route.ts`
- Future pain: changes to order fields or admin tooling will break older paths unpredictably.
- Recommended fix direction: choose one canonical daily-order model and API family, migrate consumers, then remove the others.

### 2. Current order creation paths are not transactional
- Severity: `critical`
- Why it matters: order creation and balance deduction can get out of sync on partial failure.
- Files involved: `app/api/daily-delivery/order/route.ts`, `app/api/weekly-subscription/user/route.ts`
- Future pain: orphaned orders, incorrect balances, manual support corrections, refund confusion.
- Recommended fix direction: wrap order creation, balance mutation, transaction/audit records, and idempotency bookkeeping in a real database transaction.

### 3. Self-service password change can bypass current-password verification
- Severity: `critical`
- Why it matters: a logged-in user can change their password through generic PATCH without using the safer dedicated flow.
- Files involved: `app/api/users/[id]/route.ts`, `app/api/users/[id]/change-password/route.ts`
- Future pain: weaker account security posture, confusing duplicate password-change behavior, hard-to-audit incident handling.
- Recommended fix direction: remove password handling from generic user PATCH and force all password changes through the dedicated re-authenticated route.

### 4. Weekly order refunds restore the wrong balance type
- Severity: `high`
- Why it matters: weekly refunds currently credit `user.credits`, even though weekly purchases also use weekly plan balances and legacy weekly fields.
- Files involved: `app/api/admin/weekly-subscription/orders/[id]/status/route.ts`, `lib/plans/balances.ts`, `models/User.ts`
- Future pain: entitlement drift, customer balance disputes, increasingly incorrect reporting as plan usage grows.
- Recommended fix direction: refund the same entitlement type that was consumed, through one centralized balance service.

### 5. Balance mutation logic is duplicated across overlapping admin endpoints
- Severity: `high`
- Why it matters: credits and vouchers are mutated through multiple routes with slightly different rules, transaction handling, and side effects.
- Files involved: `app/api/users/[id]/add-credits/route.ts`, `app/api/users/[id]/deduct-credits/route.ts`, `app/api/users/[id]/credits/route.ts`, `app/api/users/[id]/update-balance/route.ts`, `app/api/users/[id]/vouchers/route.ts`
- Future pain: inconsistent balances, duplicate code changes, uneven audit quality, more bugs when adding new entitlement types.
- Recommended fix direction: collapse to one service-backed mutation API with explicit operation types and audit hooks.

### 6. Order summary emails trust client-authored payloads
- Severity: `high`
- Why it matters: business communications should come from persisted server truth, not request body composition.
- Files involved: `app/api/send-order-summary-email/route.ts`, `lib/services/email.ts`
- Future pain: incorrect or tampered summaries, support disputes, inconsistent admin/customer records.
- Recommended fix direction: accept only canonical order IDs and build the email payload server-side from persisted orders and user records.

### 7. Giant client controllers are already beyond safe growth size
- Severity: `high`
- Why it matters: `app/admin/page.tsx`, `app/dashboard/page.tsx`, and several checkout/management components are overloaded coordination layers.
- Files involved: `app/admin/page.tsx`, `app/dashboard/page.tsx`, `components/daily-delivery-management.tsx`, `components/weekly-subscription-management.tsx`, `components/daily-delivery-checkout.tsx`, `components/weekly-subscription-checkout.tsx`
- Future pain: feature work becomes slower, reviews become weaker, regressions increase because changes have broad hidden effects.
- Recommended fix direction: split by domain and by state ownership, moving business logic into hooks/services and shrinking page components into composition layers.

### 8. Route-level schema duplication and dead middleware create drift risk
- Severity: `medium`
- Why it matters: inline schemas in admin routes and the unused `lib/middleware.ts` indicate multiple authoritative definitions for important behavior.
- Files involved: `middleware.ts`, `lib/middleware.ts`, admin order route files under `app/api/admin/**`
- Future pain: fixes land in one place but not another, security assumptions diverge from actual runtime behavior.
- Recommended fix direction: delete dead middleware, import canonical models everywhere, and ban route-local schema duplication.

### 9. No serious automated test coverage for commerce/security flows
- Severity: `high`
- Why it matters: the codebase is too stateful and too duplicated to rely on manual testing alone.
- Files involved: `package.json`, `scripts/test-*.js`, all core order/payment/auth routes
- Future pain: confidence drops, releases slow down, regressions become production-discovered.
- Recommended fix direction: add focused integration tests for signup/login, password change, purchase request approval, daily order placement, weekly order placement, and refund flows.

### 10. In-memory rate limiting and idempotency are not scaling-safe
- Severity: `medium`
- Why it matters: protections disappear across multiple instances or cold starts.
- Files involved: `lib/security/rate-limit.ts`, `app/api/daily-delivery/order/route.ts`
- Future pain: duplicate submissions, inconsistent protection behavior, environment-specific bugs in production.
- Recommended fix direction: move rate limit and idempotency keys to a shared durable store.

## 12. Final Verdict

Direct verdict: `workable but should fix several structural issues first`.

What must be fixed before adding more core features:
- Unify the daily and weekly order domains so there is one canonical model and one canonical lifecycle per order type.
- Make order creation and entitlement mutation transactional.
- Remove the password-change bypass in `app/api/users/[id]/route.ts`.
- Centralize refund and balance restoration logic so it restores the correct entitlement type.
- Stop building order-summary emails from client-authored payloads.

What should be cleaned soon:
- Split giant client controllers.
- Collapse overlapping admin balance endpoints.
- Remove dead/legacy paths that still appear wired into admin UI.
- Replace route-local validation with shared schemas.
- Add targeted automated tests for purchase, refund, and account-security paths.

What is okay to leave for later:
- Non-core UI cleanup in isolated pages.
- Smaller naming inconsistencies that do not affect behavior.
- Some email-template modularization, after core commerce/auth flows are stabilized.

Bottom line:
- This codebase can continue shipping features, but it is not a strong foundation for aggressive long-term feature expansion in its current form.
- It is healthiest in plan catalog/configuration work and weaker in order lifecycle, entitlements, admin operations, and account mutation.
- If the team keeps expanding those core domains without consolidation first, the cost of each new feature will rise faster than normal and correctness bugs will become harder to localize.

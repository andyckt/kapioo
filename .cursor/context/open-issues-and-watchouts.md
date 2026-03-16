# Open Issues and Watchouts

Important unresolved items and cautions for new Cursor sessions or contributors.

## TypeScript and Build

- Repo has **pre-existing unrelated TypeScript errors** elsewhere. `npx tsc --noEmit` does not pass cleanly.
- No full repo-wide clean `tsc --noEmit` achieved yet. Targeted lint checks were run for Phase 2 work; new changes should not introduce errors in touched files.

## Historical Data

- **Historical weekly records were not backfilled.** Old orders lack `weeklyEntitlementGroupId` and `allocatedMealCount`. UI uses fallback display logic (`mealPlanType` → `creditCost`).
- Do not assume all weekly orders have parent-child linkage. Handle missing group data gracefully.

## Manual and Exceptional Paths

- **Delete-with-return** (`returnCredits=true`) is an exceptional path. It performs entitlement restoration; it is separate from normal status PATCH. Handle with care.
- Manual balance adjustments that bypass the consolidated `update-balance` service remain a risk. New tooling should use the canonical endpoint.

## High-Risk Areas

- **Daily-order domain** still has competing paths (Order vs DailyDeliveryOrder). Changes here need extra caution until canonicalization (Must Fix #1) is done.
- **Order placement and balance mutation** are not transactional. Partial failures can leave inconsistent state.
- **app/admin/page.tsx** and **app/dashboard/page.tsx** are very large (~4k+ lines). Refactors have high regression blast radius; extract small slices and test.

## Other Caveats

- Legacy order routes under `app/api/orders` return 410. They are stubs; no live UI calls them. Optional follow-up: delete stub files entirely.
- `lib/middleware.ts` was removed in Phase 2E. Only root `middleware.ts` is the Next.js middleware entrypoint.

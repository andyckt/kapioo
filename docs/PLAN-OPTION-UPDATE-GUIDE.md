# Plan Option Update Guide (Daily + Weekly)

Use this guide whenever you add or modify plan options so changes stay centralized and low-risk.

## 1) Update Catalog (single source of truth)

- Edit `lib/plans/catalog.ts`.
- Add or update entries in:
  - `WEEKLY_PLANS` for weekly meal box options.
  - `DAILY_PLANS` for daily voucher options.
- Keep IDs stable:
  - Weekly: `weekly-{meals}x{weeks}` (example: `weekly-16x8`)
  - Daily: `daily-{2dish|3dish}-{credits}` (example: `daily-3dish-46`)

## 2) Confirm Service-Layer Coverage

- Ensure helper lookups in `lib/plans/service.ts` can resolve the new option by ID and by attributes.
- If needed, update label/tag helpers there (not in random UI files).

## 3) Verify Request APIs Use Plan IDs

- Weekly request create/read path: `app/api/credits/request/route.ts`
- Daily request create/read path: `app/api/voucher-requests/route.ts`
- Confirm pricing is derived from service helpers, and `planId` is stored on request records.

## 4) Verify UI Reads from Catalog

- Weekly selection UI should map from `listWeeklyPlans()`:
  - `app/weekly-meal/page.tsx`
  - `components/credit-purchase-plans.tsx`
- Daily selection UI should map from `listDailyPlans()`:
  - `app/daily-delivery/page.tsx`
  - `components/meal-voucher-purchase.tsx`

## 5) Verify Admin + Email Compatibility

- Confirm new options display correctly in:
  - Admin review/approval and exports.
  - Email labels/translations (`lib/email-translations.ts`, `lib/services/email.ts`).
- For weekly plan-type enums/mappings, include new options where a finite list is still required.

## 6) Verify Balance and Backward Compatibility

- Primary balances should use `planBalances`.
- Keep compatibility for legacy fixed fields where still needed.
- If you introduce new structure/IDs affecting old data, run or extend:
  - `scripts/migrate-plan-balances-to-catalog.js`

## 7) Test Minimum Scenarios

- Weekly: create request with the new option, approve it, verify user balance and history.
- Daily: create request with the new option, verify history and checkout totals.
- Validate one email and one admin export record.

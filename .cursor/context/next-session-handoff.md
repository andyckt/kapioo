# Next Session Handoff

Practical handoff for a new Cursor session / different account. Read this first to continue safely.

## What Has Been Accomplished

- **Phase 1–2E** of foundation hardening: complete.
- **Post-Phase 2E weekly refinements**: complete (split parent-child model, display fixes, admin traceability, status-only child cancellation).
- Balance mutations consolidated; legacy order and balance compatibility routes retired.
- Weekly domain is stable for new split orders; historical records use fallback display.

## What Not to Re-Audit

- Do **not** run a full codebase re-audit. Use `.cursor/context/` and `.cursor/plans/foundation-hardening-plan.md` as the source of truth.
- Do **not** restart the foundation plan from scratch.
- Do **not** re-debate weekly-order decisions (parent-child model, status-only cancellation). They are documented in `weekly-order-decisions.md`.

## Recommended Next Task

**Phase 3: Admin-page decomposition.**  
Start with lowest-risk slices: **settings**, then **promo**, then order/balance sections.  
Ref: `foundation-plan-status.md`, `current-project-state.md`.

## What Not to Touch Casually

- Daily-order paths (`app/api/daily-delivery/`, `models/Order.ts`, legacy `Order` model) without a clear plan—canonicalization (Must Fix #1) is still pending.
- Order placement or balance mutation logic without considering transactions (Must Fix #2).
- `lib/orders/weekly-status.ts` or weekly status API—operator flow is deliberately simplified (no refund from status).
- `lib/balances/mutations.ts` or balance consolidation—use canonical `update-balance` API for new mutations.
- Delete-with-return / `returnCredits=true` paths—exceptional; handle with care.

## How to Continue Safely

1. Read `.cursor/context/current-project-state.md` and `foundation-plan-status.md`.
2. For weekly-order work, read `weekly-order-decisions.md`.
3. For risks and caveats, read `open-issues-and-watchouts.md`.
4. Start Phase 3 with small, scoped extractions from `app/admin/page.tsx` (settings, promo).
5. Keep changes localized; avoid broad refactors across order/balance domains without explicit scope.
6. Run lint and targeted `tsc` checks on touched files; do not expect full repo `tsc --noEmit` to pass yet.

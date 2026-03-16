# Weekly Order Decisions and Implementation

Final decisions and current implementation for the weekly subscription / meal voucher product. Use this as the source of truth when touching weekly-order logic.

## Product Model

- **Weekly is a weekly-pass / voucher product**, not daily-style credit spending. One voucher covers a fixed number of meals per week; usage is tracked at the week/voucher level, not per-delivery credits.

## Split Order Parent-Child Model

- Split weekly orders (multiple deliveries from one weekly voucher) use a **parent-child model**.
- **`WeeklyEntitlementGroup`** (`models/WeeklyEntitlementGroup.ts`) is the parent concept: one voucher usage for a week, shared across multiple child deliveries.
- **Child** `WeeklyOrder` documents store:
  - `weeklyEntitlementGroupId` – links to the parent group
  - `allocatedMealCount` – meals allocated to this specific delivery
- Split checkout generates a stable group ID (`weg-{uuid}`) and passes it to all child-order writes via `app/api/weekly-subscription/user/route.ts`.

## Display and Traceability

- **`weeklyEntitlementSummary`** is the display source for voucher vs. meal semantics. Built by `lib/orders/weekly-entitlement-display.ts`.
- Customer history and admin detail show "Weekly Voucher Used" (parent meaning) and "Allocated Meals For This Delivery" (child allocation) instead of misleading "Credit Cost".
- **Admin linked-order traceability** exists: admin modal shows "Linked Weekly Group" with copyable group ID and sibling order list; search supports `weeklyEntitlementGroupId`.

## Status and Cancellation

- **Weekly child-order cancellation is status-only.** No automatic refund or entitlement restoration from normal status changes.
- **`refunded`** was removed from the normal operator flow. It remains in stored statuses for historical records only.
- **Operator statuses** are: pending, confirmed, delivery, delivered, cancelled. Use `WEEKLY_OPERATOR_ORDER_STATUSES` from `lib/orders/weekly-status.ts`.
- Admin status PATCH (`app/api/admin/weekly-subscription/orders/[id]/status/route.ts`) is a pure fulfillment status update. It does not perform entitlement restoration.

## Exceptional Paths

- **Delete-with-return** (`returnCredits=true`) remains an exceptional / manual path, separate from normal status flow. This is handled outside the status API (e.g. delete endpoints with explicit restoration).

## Historical Data

- **Old historical weekly records were not backfilled.** They have no `weeklyEntitlementGroupId` or `allocatedMealCount`.
- **UI fallback logic**: Use `mealPlanType` then legacy `creditCost` for old records when `weeklyEntitlementSummary` is absent. Implemented in `components/weekly-subscription-history.tsx` and admin display.

## Key Files

- `models/WeeklyEntitlementGroup.ts`
- `models/WeeklyOrder.ts`
- `lib/orders/weekly-entitlement-display.ts`
- `lib/orders/weekly-status.ts`
- `app/api/weekly-subscription/user/route.ts`
- `app/api/admin/weekly-subscription/orders/[id]/route.ts`
- `app/api/admin/weekly-subscription/orders/[id]/status/route.ts`
- `components/view-weekly-orders.tsx`
- `components/weekly-subscription-history.tsx`

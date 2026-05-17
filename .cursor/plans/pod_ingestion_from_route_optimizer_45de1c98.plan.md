---
name: POD ingestion from Route Optimizer
overview: Accept Proof-of-Delivery info from the external Route Optimizer over a single signed webhook, store only an R2 image reference on each related Kapioo order, flip those orders to `delivered`, and surface a POD card in both customer and admin order details.
todos:
  - id: model
    content: Add optional `proofOfDelivery` subdocument to DailyDeliveryOrder and WeeklyOrder models.
    status: completed
  - id: contract
    content: Add Zod contract + types in `lib/contracts/proof-of-delivery.ts`.
    status: completed
  - id: ssot
    content: Build canonical `applyProofOfDelivery` service with per-order independent updates, dedupe, idempotency rules (updated/skipped/missing), audit log.
    status: completed
  - id: webhook
    content: Build `/api/integrations/route-optimizer/proof-of-delivery` route with Bearer + HMAC + host allowlist + node runtime + raw-body read.
    status: completed
  - id: reads
    content: Surface `proofOfDelivery` on the four GET routes; pass URL through `rewriteS3UrlToCloudFront`.
    status: completed
  - id: ui-shared
    content: Build shared `ProofOfDeliveryCard` (image + lightbox + open-in-new-tab + i18n).
    status: completed
  - id: ui-wire
    content: Render the card in the admin shared dialog and in both customer history dialogs.
    status: completed
  - id: i18n
    content: Add Zh + En POD keys in `lib/language-context.tsx`.
    status: completed
  - id: flags
    content: Add `lib/proof-of-delivery-flags.ts` with two booleans; wire UI to them.
    status: completed
  - id: notify
    content: Add optional delivered email path gated by `POD_NOTIFY_CUSTOMER` env.
    status: completed
  - id: tests
    content: Add Vitest integration coverage for SSOT (mixed/dupe/terminal/missing/POD-already-present) and webhook auth (Bearer + HMAC).
    status: completed
  - id: testscript
    content: Add `scripts/sign-pod-request.js` so anyone can generate a curl with a valid HMAC for manual testing.
    status: pending
  - id: docs
    content: Update `ENV-VARIABLES.md` (without scope creep) for the four new env vars.
    status: completed
isProject: false
---

## 1. What the current codebase already gives us

- Two order models share a status enum (`pending → confirmed → delivery → delivered → cancelled → refunded`) and already stamp `deliveredAt`:
  - [models/DailyDeliveryOrder.ts](models/DailyDeliveryOrder.ts)
  - [models/WeeklyOrder.ts](models/WeeklyOrder.ts)
- Zod mirrors of the enum (single source of truth for API contracts): [lib/contracts/daily-order.ts](lib/contracts/daily-order.ts), [lib/contracts/weekly-order.ts](lib/contracts/weekly-order.ts), and weekly transition rules in [lib/orders/weekly-status.ts](lib/orders/weekly-status.ts).
- Admin status PATCH routes (refund + balance mutations, status stamping, email): [app/api/admin/daily-delivery/orders/[id]/status/route.ts](app/api/admin/daily-delivery/orders/%5Bid%5D/status/route.ts), [app/api/admin/weekly-subscription/orders/[id]/status/route.ts](app/api/admin/weekly-subscription/orders/%5Bid%5D/status/route.ts) — both intentionally skip the email when flipping to `delivered`.
- Image URL convention: store the S3/R2 URL; rewrite to CDN at read-time with `rewriteS3UrlToCloudFront` in [lib/upload/menu-image.ts](lib/upload/menu-image.ts) (set `AWS_CLOUDFRONT_DOMAIN`).
- Customer order dialogs (where the POD card will appear): [components/daily-delivery-history.tsx](components/daily-delivery-history.tsx), [components/weekly-subscription-history.tsx](components/weekly-subscription-history.tsx).
- Admin order detail dialog with an `extraContent` slot: [components/admin-orders/order-detail-dialog.tsx](components/admin-orders/order-detail-dialog.tsx).
- Reusable image lightbox pattern we will copy for POD viewing: [components/unified-recharge-history.tsx](components/unified-recharge-history.tsx).
- Auth conventions we will reuse:
  - Bearer (cron): [app/api/cron/process-next-week-email-jobs/route.ts](app/api/cron/process-next-week-email-jobs/route.ts)
  - HMAC (webhook): [app/api/webhooks/resend/email-events/route.ts](app/api/webhooks/resend/email-events/route.ts)

No POD-related fields, route, or driver/route-optimizer integration exists yet.

## 2. Data model — one shared POD subdocument, added to both order models

A small embedded **reference-only** object (no image bytes ever leave R2; we never re-upload or proxy the file). Optional → no impact on legacy orders.

```ts
// lib/models/proof-of-delivery.ts (new)
export interface IProofOfDelivery {
  imageUrl: string;              // R2 URL we will render directly to the user
  imageKey?: string;             // R2 object key (for future re-signing / migration)
  capturedAt: Date;              // when Route Optimizer says it was captured
  receivedAt: Date;              // when we saved it
  stopId?: string;               // Route Optimizer stop id
  driverId?: string;             // optional, for audit
  source: 'route-optimizer' | 'admin-manual';
  note?: string;                 // optional driver note
}
```

Add `proofOfDelivery?: IProofOfDelivery` (optional, with `_id: false`) to both:

- [models/DailyDeliveryOrder.ts](models/DailyDeliveryOrder.ts)
- [models/WeeklyOrder.ts](models/WeeklyOrder.ts)

No index needed beyond existing `orderId` unique index. Storing the R2 URL **and** key gives us forward-compat if R2 ever requires signed URLs — but the source of truth remains the Route Optimizer's R2 bucket.

## 3. SSOT service — one function applies POD to N orders independently

New `lib/orders/apply-proof-of-delivery.ts` is the canonical entry point. Webhook, future admin manual override, and tests all call this. **No multi-document Mongo transaction is used — each order is updated independently** so a single bad row never poisons the rest of the batch and partial success is the natural shape of the response.

Algorithm (simple and predictable):

1. **Dedupe** the incoming `orderIds` (`Array.from(new Set(...))`) and trim/normalize to strings before any DB work.
2. For each `orderId`, look it up in **daily** first, then **weekly** (each model has its own `orderId` unique index).
3. Apply the idempotency rules in §3.1, using a single guarded `findOneAndUpdate` per order with an `$exists`/`$ne` filter so concurrent writers cannot race.
4. Push the result into one of three arrays: `updated`, `skipped`, `missing`.
5. Return `{ updated: [...], skipped: [...], missing: [...], stopId }` — the same shape the webhook returns.
6. Write one audit log entry per processed orderId (`pod.applied` or `pod.skipped`) so admins can see history without us touching balances.

Changing storage shape, idempotency, or hooks later happens **only here**.

### 3.1 Idempotency rules (canonical)

Applied per orderId in this order:

| Current state of order | Action | Returned in |
|---|---|---|
| Not delivered (any non-terminal status) | Save `proofOfDelivery`, set `status='delivered'`, set `deliveredAt = capturedAt ?? now` | `updated` |
| Already delivered, **no** `proofOfDelivery` | Save `proofOfDelivery`, keep `status='delivered'`, set `deliveredAt` **only if it is currently missing** (do not overwrite an existing admin-set `deliveredAt`) | `updated` |
| Already delivered **and** already has `proofOfDelivery` | Do nothing | `skipped` with `reason: "already-delivered-with-pod"` |
| `cancelled` / `refunded` / any terminal status | Do nothing | `skipped` with `reason: "terminal-status"` |
| Not found in either collection | Do nothing | `missing` |

This protects an existing POD from a driver double-tap or wrong upload, while still tolerating the case where admin marked the order delivered before the photo arrived.

> Note: The DB filter on the second `findOneAndUpdate` uses `proofOfDelivery: { $exists: false }` so two near-simultaneous webhook calls cannot both succeed; the loser falls into the already-has-pod branch on its next read.

## 4. Webhook endpoint (route optimizer → Kapioo)

New `app/api/integrations/route-optimizer/proof-of-delivery/route.ts`:

- `POST` body (Zod-validated, contract in [lib/contracts/proof-of-delivery.ts](lib/contracts/proof-of-delivery.ts) new):

```ts
{
  orderIds: string[];              // 1..N Kapioo orderId values; we will dedupe server-side
  podImage: { url: string; key?: string };
  capturedAt: string;              // ISO timestamp from Route Optimizer
  stopId?: string;
  driverId?: string;
  note?: string;
}
```

No `replace` / overwrite flag in v1 — overwrite is intentionally off and only changeable later via the SSOT (keeps the contract small and predictable for the other team).

- **Auth (both):**
  - Bearer check: `Authorization: Bearer ${ROUTE_OPTIMIZER_INGEST_TOKEN}` (mirrors cron file above).
  - HMAC body check: `X-RO-Signature: sha256=<hex>` of the raw body using `ROUTE_OPTIMIZER_INGEST_SECRET` (mirrors Resend route). We compute on the raw bytes — set `runtime = 'nodejs'`, read `await request.text()` once.
- Returns **200** with a per-order report so partial success is observable. Easy for Route Optimizer to consume — three simple arrays:

```json
{
  "success": true,
  "data": {
    "updated":  [{ "orderId": "KP-D-00123", "service": "daily" }],
    "skipped":  [{ "orderId": "KP-D-00124", "reason": "already-delivered-with-pod" },
                 { "orderId": "KP-D-00125", "reason": "terminal-status", "status": "cancelled" }],
    "missing":  [{ "orderId": "KP-D-99999" }],
    "stopId":   "stop_98765"
  }
}
```

- A bad orderId in the batch never blocks the rest. The response is 200 unless the **request itself** is unauthenticated/malformed (401/400). Every call is logged with `stopId` and an HMAC body hash so we can correlate Route Optimizer logs without storing raw bodies.

## 5. Read-side — expose POD on existing GETs

These already power the customer/admin dialogs; we just include the new field and rewrite the URL through the existing helper.

- Customer:
  - [app/api/daily-delivery/order/[id]/route.ts](app/api/daily-delivery/order/%5Bid%5D/route.ts)
  - [app/api/weekly-orders/[id]/route.ts](app/api/weekly-orders/%5Bid%5D/route.ts)
- Admin:
  - [app/api/admin/daily-delivery/orders/[id]/route.ts](app/api/admin/daily-delivery/orders/%5Bid%5D/route.ts)
  - [app/api/admin/weekly-subscription/orders/[id]/route.ts](app/api/admin/weekly-subscription/orders/%5Bid%5D/route.ts)

In each response, call `rewriteS3UrlToCloudFront(order.proofOfDelivery?.imageUrl)` so swapping R2 ↔ CDN ↔ R2 in future is a one-line change.

## 6. UI — one shared `ProofOfDeliveryCard`

New `components/orders/proof-of-delivery-card.tsx` rendered identically in customer and admin dialogs. Reuses the image lightbox pattern from [components/unified-recharge-history.tsx](components/unified-recharge-history.tsx) (second `Dialog`, "Open in new tab", `VisuallyHidden` title). It handles empty state ("No photo yet — order not yet delivered").

Insertion points:

- Customer daily: inside the Delivery section of [components/daily-delivery-history.tsx](components/daily-delivery-history.tsx).
- Customer weekly: inside the Delivery section of [components/weekly-subscription-history.tsx](components/weekly-subscription-history.tsx).
- Admin (both daily + weekly): inside the shared dialog [components/admin-orders/order-detail-dialog.tsx](components/admin-orders/order-detail-dialog.tsx), placed after the Delivery `Card` and before `{extraContent}`. One insertion covers both admin tabs.

## 7. i18n — small set of new keys

Add to [lib/language-context.tsx](lib/language-context.tsx) (Zh + En together per workspace rule):

```ts
proofOfDeliveryTitle, proofOfDeliveryEmpty, viewProofPhoto,
proofPhotoCapturedAt, openInNewTab, proofUnavailable
```

Reuse existing `delivered`, `deliveredStatus`, `viewDetails`.

## 8. Feature flag (rollout safety)

`lib/proof-of-delivery-flags.ts` mirroring the home flag file:

```ts
export const SHOW_POD_IN_CUSTOMER_ORDER_DETAILS = true
export const SHOW_POD_IN_ADMIN_ORDER_DETAILS = true
```

UI cards render only when flag is true; the webhook always saves regardless so we can dry-run server-side first.

## 9. Email — explicitly out of the core flow (env flag only, default OFF)

Email is **not** part of v1's core path. The SSOT only sends if the env flag is on:

- `if (process.env.POD_NOTIFY_CUSTOMER === 'true') { sendDailyOrderStatusUpdateNotification(...) }` — reuses the existing helper for both daily and weekly.
- Defaults to `false`. Matches today's admin behavior of staying silent on `delivered`. No new email template, no new copy. Can be flipped without code change later.
- If the email path throws, it is caught and logged — it must **never** affect the saved POD or the status flip. The webhook still returns 200 with the POD applied.

## 10. Security checklist (both layers active)

- Bearer (`ROUTE_OPTIMIZER_INGEST_TOKEN`) gates the route; rejected → 401.
- HMAC (`ROUTE_OPTIMIZER_INGEST_SECRET`) verifies body integrity (constant-time compare); rejected → 401.
- Pin route handler to `runtime = 'nodejs'` so we can read raw body for HMAC.
- Strict Zod input (max 50 order IDs per call, image URL must be `https://...` and on an allowlisted host such as `r2.kapioo.com` / R2 domain) — prevents abuse where someone signs a body but injects a phishing URL.
- Endpoint outside `/api/admin/*` so it does not require admin MFA, but middleware should explicitly allow it; see [middleware.ts](middleware.ts) — confirm it is not gated by an admin matcher.
- Rate-limit by `stopId`: same `stopId` repeated within 5s is treated as the same call (in-memory LRU). Optional but reduces double-tap noise.
- All decisions are logged via the existing audit pattern used by `applyBalanceMutations` (no balance changes here, just an audit entry: `pod.ingested`, target = order id).

## 11. Edge cases — exactly how each is handled

- **All wrong IDs** → 200 with `missing: [...]`, nothing changed.
- **Mixed valid/invalid IDs** → 200, valid ones flipped, invalid in `missing` (per-id, no transaction over the bad ones).
- **Duplicate orderIds in one batch** → SSOT dedupes before processing; one result per unique id.
- **Duplicate submission (driver double-tap, different requests)** → second call hits the `proofOfDelivery: { $exists: false }` guard and is reported as `skipped: already-delivered-with-pod`.
- **Already delivered (admin marked it earlier, no POD)** → still attaches the POD, keeps existing `deliveredAt` if already present, otherwise sets it. Reported in `updated`.
- **Missing URL** → Zod rejects (400). `key` is optional; URL is required.
- **Image URL changes/expires later** → we store the key; if/when R2 needs signed URLs we sign at read time in the same `rewriteS3UrlToCloudFront`-style helper.
- **Refunded / cancelled / any terminal status** → SSOT refuses to set POD and records `skipped: terminal-status`.
- **Webhook called concurrently for the same stop** → per-order guarded `findOneAndUpdate` means only one writer wins; the loser falls into `already-delivered-with-pod` on its re-read.
- **Customer fetch race** → GET routes always rewrite the URL; the existing client `useEffect` re-renders when the dialog reopens; nothing else changes.
- **Untrusted host in `podImage.url`** → blocked by allowlist regex; webhook responds 400.
- **Order ID is daily in collection A and another daily in collection B** → daily and weekly `orderId` are unique within their own collections; SSOT looks up in both and applies to whichever matches.

## 12. Files to change / add

Add:

- `lib/models/proof-of-delivery.ts`
- `lib/contracts/proof-of-delivery.ts`
- `lib/orders/apply-proof-of-delivery.ts`
- `lib/proof-of-delivery-flags.ts`
- `app/api/integrations/route-optimizer/proof-of-delivery/route.ts`
- `components/orders/proof-of-delivery-card.tsx`
- `scripts/sign-pod-request.js` (HMAC signer for manual testing — see §15)

Modify (small):

- `models/DailyDeliveryOrder.ts`, `models/WeeklyOrder.ts` (add optional `proofOfDelivery` field)
- The four GET routes listed in §5 (include + rewrite URL)
- `components/admin-orders/order-detail-dialog.tsx` (insert card after Delivery)
- `components/daily-delivery-history.tsx`, `components/weekly-subscription-history.tsx` (insert card in dialog Delivery section)
- `lib/language-context.tsx` (Zh + En keys)
- `middleware.ts` (only if needed to whitelist `/api/integrations/route-optimizer/*` from any admin matcher — confirm during impl)

## 13. Env vars

```
ROUTE_OPTIMIZER_INGEST_TOKEN=<long random>         # Bearer
ROUTE_OPTIMIZER_INGEST_SECRET=<long random>        # HMAC sha256
POD_IMAGE_HOST_ALLOWLIST=r2.kapioo.com,img.kapioo.com   # CSV; required
POD_NOTIFY_CUSTOMER=false                          # flip later if desired
AWS_CLOUDFRONT_DOMAIN=img.kapioo.com               # already documented
```

## 14. How the Route Optimizer should call us

```http
POST https://kapioo.com/api/integrations/route-optimizer/proof-of-delivery
Authorization: Bearer <ROUTE_OPTIMIZER_INGEST_TOKEN>
X-RO-Signature: sha256=<hex hmac of raw body using ROUTE_OPTIMIZER_INGEST_SECRET>
Content-Type: application/json

{
  "orderIds": ["KP-D-00123", "KP-D-00124"],
  "podImage": { "url": "https://r2.kapioo.com/pod/2026/05/abc.jpg", "key": "pod/2026/05/abc.jpg" },
  "capturedAt": "2026-05-17T22:31:00Z",
  "stopId": "stop_98765",
  "driverId": "driver_42"
}
```

## 15. Manual test plan

### 15.1 HMAC signer for manual testing (`scripts/sign-pod-request.js`)

A tiny zero-dep Node script so anyone on the team (or the Route Optimizer dev) can produce a valid signed request without writing code. Pseudocode for the script we will add:

```js
// scripts/sign-pod-request.js
// Usage:
//   ROUTE_OPTIMIZER_INGEST_TOKEN=xxx \
//   ROUTE_OPTIMIZER_INGEST_SECRET=yyy \
//   node scripts/sign-pod-request.js ./payload.json https://kapioo.com
const crypto = require('node:crypto');
const fs = require('node:fs');
const [, , payloadPath, baseUrl = 'http://localhost:3000'] = process.argv;
const raw = fs.readFileSync(payloadPath, 'utf8');                 // raw body bytes (no re-stringify)
const secret = process.env.ROUTE_OPTIMIZER_INGEST_SECRET;
const token  = process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
console.log(`curl -sS -X POST '${baseUrl}/api/integrations/route-optimizer/proof-of-delivery' \\
  -H 'Authorization: Bearer ${token}' \\
  -H 'X-RO-Signature: ${sig}' \\
  -H 'Content-Type: application/json' \\
  --data-binary @${payloadPath}`);
```

Critical: the script must sign the **exact bytes** that get POSTed (use `--data-binary @file`, never `--data`, otherwise curl reformats the body and HMAC fails).

### 15.2 Scenarios

- Happy path: send one orderId; verify Mongo `proofOfDelivery` saved, status = `delivered`, `deliveredAt` set, customer dialog shows the photo, admin dialog shows it.
- Multi-order stop: send two real ids; both flip; both customer accounts see their own photo.
- Duplicate orderIds in the body: response treats them as one (dedupe).
- Mixed valid + invalid + cancelled IDs in one call: response contains entries in `updated`, `missing`, and `skipped: terminal-status` — and the valid one is still flipped.
- Admin pre-marked delivered (no POD), then webhook fires: POD attaches, status stays `delivered`, original `deliveredAt` preserved.
- Replay the same call: second response shows `skipped: already-delivered-with-pod`; nothing changes in DB.
- Wrong signature → 401; missing Bearer → 401; bad JSON → 400; non-allowlisted image host → 400.
- Set `POD_NOTIFY_CUSTOMER=true`, repeat happy path; verify one delivered email arrives. Email failure does not undo the POD save.
- Unset `AWS_CLOUDFRONT_DOMAIN` → GETs return raw R2 URL; set it → GETs return CDN URL (same image).
- Toggle `SHOW_POD_IN_CUSTOMER_ORDER_DETAILS=false` → photo hidden in customer dialog but still in admin (and still saved in DB).
- Vitest integration (`__tests__/proof-of-delivery.test.ts`): missing id, mixed, dupe within batch, terminal status, already-delivered-no-POD, already-delivered-with-POD, concurrent writers.

## 16. Success vs failure shapes

- Success: HTTP 200 with `{ success: true, data: { updated, skipped, missing, stopId } }`. Orders show `delivered` + POD photo in both dashboards within seconds. Three arrays are always present (possibly empty) so the Route Optimizer can treat the response identically.
- Failure: HTTP 401 (Bearer or HMAC), 400 (invalid body, untrusted host, too many ids), 500 (DB failure) with `{ success: false, error }`. Server logs include `stopId` + body hash for replay/debugging.
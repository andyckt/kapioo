# Recovery Audit Artifacts

Generated for the assigned to-dos:

- `artifact-api-access-audit`
- `artifact-localstorage-audit`
- `artifact-notification-matrix`
- `artifact-legacy-compat`
- `artifact-middleware-consistency`
- `phase-0-settings-hotfix`
- `phase-0-mobile-logout`

## Artifact 1: API Route Access Classification

### Summary

- Total route files audited: `114`
- Middleware-gated as `admin+mfa`: `43`
- Middleware-gated as `auth-required`: `14`
- No middleware prefix match: `57`
- Handler-intended access split:
  - `admin+mfa`: `67`
  - `admin`: `1`
  - `user`: `8`
  - `self-or-admin`: `8`
  - `mixed(user / admin+mfa)`: `7`
  - `mixed(self / admin)`: `1`
  - `public`: `22`

### Key Findings

- `/api/settings` was the only proven user-facing middleware mismatch. It is now fixed to allow public-safe `GET /api/settings?key=cutoffTime` while keeping admin+MFA protection for writes and non-public reads.
- Many routes intentionally rely on handler guards without middleware prefix protection. These are not automatically bugs, but they are maintenance-sensitive because protection is no longer visible from middleware alone.
- `/api/auth/admin-mfa` is structurally inconsistent: `GET` and `POST` require `requireAdmin()`, but `DELETE` still has no handler guard. This remains a Phase 1 item.
- Public machine/integration routes currently include Auth.js handlers, password-reset/verification endpoints, cron, resend webhook, and unsubscribe.

### Full Classification Table

```text
route	methods	intended_access	middleware_status	handler_guard
/api/admin/daily-delivery/orders/[id]/customer-info	PATCH	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/[id]	GET,DELETE	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/[id]/status	PATCH	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/areas	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/combos	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/delivery-dates	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders/export	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/daily-delivery/orders	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/eligible-users	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/meal-rating/active-date	PUT	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/meal-rating	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/next-week-email-jobs/[jobId]	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/next-week-email-jobs	POST,GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/notify-menu-update	POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/notify-next-week-menu	POST,GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/notify-weekly-menu-update	POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/promo-codes/[id]/redemptions	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/promo-codes/[id]	GET,PATCH	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/promo-codes	GET,POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/rating-dishes	GET,POST,DELETE	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/trigger-email-processing	POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/update-combo-text	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/[id]/customer-info	PATCH	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/[id]	GET,DELETE	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/[id]/status	PATCH	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/areas	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/delivery-dates	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders/export	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/admin/weekly-subscription/orders	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/auth/[...nextauth]	Auth.js handlers	public	none	none
/api/auth/admin-mfa	GET,POST,DELETE	admin	none	requireAdmin
/api/auth/login	POST	public	none	none
/api/auth/me	GET	public	none	none
/api/auth/request-password-reset	POST	public	none	none
/api/auth/resend-verification	POST	public	none	none
/api/auth/reset-password	POST	public	none	none
/api/auth/send-verification-code	POST	public	none	none
/api/auth/send-verification	POST	public	none	none
/api/auth/verify-email	POST	public	none	none
/api/auth/verify-phone	POST	public	none	none
/api/auth/verify-reset-code	POST	public	none	none
/api/combos/[comboId]	GET,PUT,DELETE	admin+mfa	none	requireAdminMfa
/api/combos	GET,POST	admin+mfa	none	requireAdminMfa
/api/credits/request/admin/export	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/credits/request/admin	GET,POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/credits/request	POST,GET	user	auth-required middleware	requireUser
/api/cron/process-next-week-email-jobs	GET,POST	public	none	none
/api/daily-delivery/order/[id]	GET	user	auth-required middleware	requireUser
/api/daily-delivery/order	POST,GET	user	auth-required middleware	requireUser
/api/day-history/[historyId]	GET,DELETE	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/day-history	GET,POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/days/[dayId]/combos	GET	public	none	none
/api/days/[dayId]	GET,PUT,DELETE	admin+mfa	none	requireAdminMfa
/api/days/active-with-combos	GET	public	none	none
/api/days	GET,POST	admin+mfa	none	requireAdminMfa
/api/days/with-combos	GET	public	none	none
/api/dishes/[name]	GET,PUT	admin+mfa	none	requireAdminMfa
/api/dishes	GET,POST	admin+mfa	none	requireAdminMfa
/api/email	POST	public	none	none
/api/maintenance/status	GET,POST	admin+mfa	none	requireAdminMfa
/api/meal-rating/active-date	GET	public	none	none
/api/meal-rating/dishes	GET	public	none	none
/api/meal-rating	POST	public	none	none
/api/meals/[id]	GET,PUT,DELETE	admin+mfa	none	requireAdminMfa
/api/meals	GET,POST	admin+mfa	none	requireAdminMfa
/api/music-submissions	GET,POST,PATCH	admin+mfa	none	requireAdminMfa
/api/music-videos	GET,POST	admin+mfa	none	requireAdminMfa
/api/notifications	POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/orders/[id]	GET,PATCH	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/orders	GET,POST	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/orders/stats	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/promo-codes/apply	POST	user	auth-required middleware	requireUser
/api/send-order-summary-email	POST	user	auth-required middleware	requireUser
/api/settings	GET,POST	mixed(public GET cutoffTime / admin+mfa otherwise)	admin+mfa middleware	requireAdminMfa
/api/tags/[id]	GET,PUT,DELETE	admin+mfa	none	requireAdminMfa
/api/tags	GET,POST	admin+mfa	none	requireAdminMfa
/api/transactions	GET	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/upload/proof	POST	user	auth-required middleware	requireUser
/api/upload	POST	user	auth-required middleware	requireUser
/api/users/[id]/activity	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/add-credits	POST	admin+mfa	none	requireAdminMfa
/api/users/[id]/change-password	POST	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/credits	POST	admin+mfa	none	requireAdminMfa
/api/users/[id]/daily-orders/count	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/deduct-credits	POST	admin+mfa	none	requireAdminMfa
/api/users/[id]/order-count	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/orders/count	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/orders	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]	GET,PATCH,DELETE	mixed(self / admin)	none	requireAdmin,requireSelfOrAdmin
/api/users/[id]/update-balance	POST	admin+mfa	none	requireAdminMfa
/api/users/[id]/vouchers	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/[id]/weekly-orders/count	GET	self-or-admin	none	requireSelfOrAdmin
/api/users/count	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/users/export	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/users	GET,POST	admin+mfa	none	requireAdminMfa
/api/users/unsubscribe	POST	public	none	none
/api/users/with-order-counts	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/voucher-requests/[requestId]	GET,PUT	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/voucher-requests/export	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/voucher-requests	GET,POST	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/webhooks/resend/email-events	POST,GET	public	none	none
/api/weekly-delivery-history/[historyId]	DELETE	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/weekly-delivery-history	GET,POST	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/weekly-meals/admin	GET	admin+mfa	admin+mfa middleware	requireAdminMfa
/api/weekly-meals	GET,POST	admin+mfa	none	requireAdminMfa
/api/weekly-meals/status	PATCH	admin+mfa	none	requireAdminMfa
/api/weekly-meals/update-week-year	POST	admin+mfa	none	requireAdminMfa
/api/weekly-meals/week-info	GET	public	none	none
/api/weekly-orders/[id]	GET,PATCH	mixed(user / admin+mfa)	none	requireAdminMfa,requireUser
/api/weekly-subscription/meal-options/[id]	GET,PUT,DELETE	admin+mfa	none	requireAdminMfa
/api/weekly-subscription/meal-options	GET,POST	admin+mfa	none	requireAdminMfa
/api/weekly-subscription	GET,POST	admin+mfa	none	requireAdminMfa
/api/weekly-subscription/user/history	GET	mixed(user / admin+mfa)	auth-required middleware	requireAdminMfa,requireUser
/api/weekly-subscription/user	GET,POST	user	auth-required middleware	requireUser
```

## Artifact 2: localStorage Writer Audit

### Summary

- Canonical cache writer: `lib/client-user-cache.ts`
- Additional duplicate writer helper: `lib/phone-helper.ts`
- Direct `localStorage.setItem('user', ...)` writers found: `9`
- `mergeStoredUser(...)` write call sites found: `14`
- Highest-risk problem class: partial object overwrite after region, address, or post-purchase balance updates

### Direct `user` Writers

```text
path	call_sites	classification	context
lib/client-user-cache.ts	1	safe	canonical low-level writer used by merge helper
lib/phone-helper.ts	1	medium	duplicate raw helper; overlaps canonical cache helper
app/address/page.tsx	1	medium	full-response replace after address PATCH; safe today because API returns full user object, brittle if response shape shrinks
app/verify-email-sent/page.tsx	1	unsafe	region/province write mutates cached object and rewrites full user blob
components/credit-purchase-plans.tsx	1	unsafe	region/address update mutates cached object and rewrites full user blob
components/meal-voucher-purchase.tsx	1	unsafe	region/address update mutates cached object and rewrites full user blob
components/weekly-subscription.tsx	1	unsafe	region/address update mutates cached object and rewrites full user blob
components/daily-delivery-checkout.tsx	1	unsafe	post-purchase voucher balance update rewrites partial user snapshot
components/weekly-subscription-checkout.tsx	1	unsafe	post-purchase weekly-plan balance update rewrites partial user snapshot
```

### Merge-Based Writers

```text
path	call_sites	classification	context
app/login/page.tsx	2	safe	initial login bootstrap from auth payload/session payload
app/verify-email/page.tsx	1	safe	post-verification auth bootstrap
app/verify-email-sent/page.tsx	1	safe	post-verification auth bootstrap
app/dashboard/page.tsx	4	safe	auth bootstrap and profile refresh merges
components/app-initializer.tsx	1	safe	global `/api/auth/me` bootstrap merge
components/daily-delivery-checkout.tsx	2	safe	phone/address sync before order submission
components/weekly-subscription-checkout.tsx	2	safe	phone/address sync before order submission
lib/phone-helper.ts	1	safe	phone update merge path
```

### Data Flow Diagram

```text
Safe path
server truth (`/api/auth/me`, `/api/users/:id` full payload, checkout update response)
  -> `mergeStoredUser(...)`
  -> `getStoredUser()` + shallow merge + nested address merge
  -> `localStorage.user`
  -> UI reads cache

Unsafe path
component reads cached `user`
  -> mutates one field subset locally
  -> `localStorage.setItem('user', JSON.stringify(partialOrStaleObject))`
  -> omitted fields disappear from cache
  -> later UI bootstraps from incomplete cache until next server refresh

Logout path after Phase 0 fix
any logout entrypoint
  -> `performClientLogout()`
  -> clear admin MFA cookie via `/api/auth/admin-mfa`
  -> remove `user` and `isAuthenticated`
  -> `signOut({ redirect: false })`
  -> route to `/login`
```

### Prioritization

- Fix first: `components/daily-delivery-checkout.tsx`, `components/weekly-subscription-checkout.tsx`, `components/weekly-subscription.tsx`, `components/meal-voucher-purchase.tsx`, `components/credit-purchase-plans.tsx`, `app/verify-email-sent/page.tsx`
- Fix later but keep in scope: `app/address/page.tsx` and duplicate helper logic in `lib/phone-helper.ts`

## Artifact 3: Notification / Email Flow Matrix

### Matrix

```text
trigger	source	recipients	emails_sent	notes
signup create user	POST /api/users	user	2	verification email is sent synchronously when user is unverified; welcome email is always sent in background, so signup can produce two user emails
resend verification	POST /api/auth/resend-verification	user	1	same verification template as other verification routes
manual verification send	POST /api/auth/send-verification	user	1	duplicate trigger surface for same verification email
manual verification code send	POST /api/auth/send-verification-code	user	1	duplicate trigger surface for same verification email
password reset request	POST /api/auth/request-password-reset	user	1	password reset email
admin MFA challenge	POST /api/auth/admin-mfa { action: "send" }	admin inbox	1	admin MFA code email
credit request approved/declined	POST /api/credits/request/admin	user	1	status email to user
voucher request approved/declined	PUT /api/voucher-requests/[requestId]	user	1	status email to user
daily order checkout summary	POST /api/send-order-summary-email { type: "daily" }	user + admin	2	daily order route explicitly skips per-order emails and relies on summary route
weekly order checkout summary	POST /api/send-order-summary-email { type: "weekly" }	user + admin	2	weekly subscription route explicitly skips per-order emails and relies on summary route
standard order created	POST /api/orders	user + admin	2	notification service sends customer + admin new-order notifications
standard order status updated	PATCH /api/orders/[id]	user	1	order status update email/notification
daily menu update blast	POST /api/admin/notify-menu-update	users with vouchers	N	batched SSE progress stream
weekly menu update blast	POST /api/admin/notify-weekly-menu-update	users with weekly plans	N	batched SSE progress stream
next-week menu blast	POST /api/admin/notify-next-week-menu	eligible opted-in users	N	job-based flow; immediate single-test and test-batch modes also exist
credits added notification	POST /api/notifications with NotificationType.CREDITS_ADDED	user	1	not dead code in current repo; triggered from `app/admin/page.tsx`
resend webhook	app/api/webhooks/resend/email-events	system	0	inbound webhook/update path, not an outbound email trigger
```

### Findings

- The plan assumption that `NotificationType.CREDITS_ADDED` is dead code is no longer true in the current codebase. `app/admin/page.tsx` posts it to `/api/notifications`.
- Verification email sending is fragmented across three API routes plus signup, all using the same template. This is a consolidation candidate, not a current blocker.
- Signup currently sends both verification and welcome emails. That may be intentional, but it is the clearest duplicate user-contact point in the repo.
- Daily and weekly checkout APIs both import individual confirmation-email helpers but explicitly skip them in favor of the summary-email route. The imports are now misleading.
- The “`0 credits` approval email” issue is not reproducible in the current `sendCreditPurchaseStatusEmail()` template. The template renders `planDescription` when present and does not display `credits` directly.
- Cancelled-with-refund messaging is still inconsistent with refunded messaging. `lib/services/notifications.ts` includes refund details only when final status is `refunded`, not when status is `cancelled` with refunded credits.

## Artifact 4: Legacy User / Browser-State Compatibility Audit

### Compatibility Table

```text
legacy_state	current_behavior	user_action_needed	notes
Auth.js v4 `next-auth.session-token` cookie	ignored by current code	no immediate action, but stale cookie is not actively expired	current repo has zero references to the v4 cookie name; user appears logged out until re-auth
Current Auth.js v5 session cookie	middleware reads explicit `authjs.session-token` / `__Secure-authjs.session-token`	no	works today, but cookie name is hardcoded only in middleware
Stale `localStorage.user` shape	`mergeStoredUser()` preserves old fields and merges address	no	works when writes go through merge path
Stale `isAuthenticated=true` with invalid session	`components/app-initializer.tsx` clears `user` and `isAuthenticated` after unauthenticated `/api/auth/me`	no	compatible cleanup is already in place
Stale admin MFA cookie	checked against authenticated user id + sessionVersion	no if session still valid; otherwise it simply fails MFA check	logout helper now proactively clears it on logout
Old/stale partial `localStorage.user` from unsafe writer	persists until next server-backed merge or explicit clear	no hard reset requested, but user can see stale profile/balance data	this is a real compatibility risk until Phase 2 normalization
`pendingUser` signup cache	used only during verification flow; removed after success	no	flow-scoped storage
`resetPasswordEmail` cache	used only during reset flow; removed after success	no	flow-scoped storage
`selectedMeals` / `selectedMealPlan` client caches	persist across sessions	no immediate auth impact, but can leak stale UI state across logout	login/logout does not currently clear these keys
Stale JS bundles after deploy	expected to refresh via hashed assets	no	server-side deploy behavior should handle this
```

### Findings

- The only known browser state that can realistically force a re-login is an old Auth.js v4 session cookie, because the v4/v5 cookie formats are not interoperable.
- That last-resort re-login path is not yet actively smoothed in code because old v4 cookies are ignored rather than expired. The compatibility story is acceptable but incomplete until the planned cleanup lands.
- The larger real-world compatibility issue today is not cookies but stale partial `localStorage.user` overwrites from unsafe writers.
- `AppInitializer` is doing the right compatibility work for stale auth flags already.

## Artifact 5: Middleware / Session Consistency Checklist

### Session Cookie Sources

```text
source	type	current_state
middleware.js	Auth.js session cookie	read via explicit hardcoded `authjs.session-token` / `__Secure-authjs.session-token`
auth.ts	Auth.js session source	relies on `auth()` and NextAuth internals; no shared exported cookie constant
codebase scan	legacy v4 cookie references	none found
```

### MFA Cookie Sources

```text
source	read_write	method
middleware.js	read	`request.cookies.get('kapioo_admin_mfa')?.value`
app/api/auth/me/route.ts	read	`request.cookies.get('kapioo_admin_mfa')?.value`
lib/auth/guards.ts	read	manual `extractCookieValue(request, "kapioo_admin_mfa")`
app/api/auth/admin-mfa/route.ts	write	set cookie on verify
app/api/auth/admin-mfa/route.ts	clear	clear cookie on delete
lib/client-logout.ts	clear	client logout now calls DELETE endpoint before sign-out
```

### Guard Inventory

```text
guard	role
getAuthenticatedActor()	server-side session + DB truth + sessionVersion enforcement
requireUser()	requires valid authenticated actor
requireAdmin()	requires authenticated actor with resolved admin role
requireAdminMfa(request)	requires admin plus valid signed MFA cookie
requireSelfOrAdmin(targetId)	requires authenticated user owning resource or admin
middleware.js	page/api prefilter route gating by path prefix
```

### Role Resolution

```text
file	function	status
auth.ts	resolveUserRole()	duplicate logic
lib/auth/guards.ts	resolveRole()	duplicate logic
```

### Checklist Outcome

- `session cookie name shared in one place`: no
- `admin MFA cookie read consistently in one way`: no
- `role resolution defined in one place`: no
- `all admin-MFA lifecycle endpoints uniformly guarded`: no
- `public-safe settings access centralized`: yes, now via `lib/settings-access.ts`
- `logout implementations share one cleanup path`: yes, now via `lib/client-logout.ts`

### Findings

- Middleware still hardcodes the Auth.js session cookie name instead of deriving it from a shared constant.
- MFA cookie reads are still inconsistent: middleware and `/api/auth/me` use `request.cookies.get()`, while `requireAdminMfa()` still manually parses the `cookie` header.
- Role resolution is duplicated between `auth.ts` and `lib/auth/guards.ts`.
- `/api/auth/admin-mfa` `DELETE` remains unguarded even though `GET` and `POST` require admin auth.

## Phase 0 Implementation Notes

### `phase-0-settings-hotfix`

- Added `lib/settings-access.ts` as the shared definition for public-safe settings reads.
- Updated `middleware.js` so `GET /api/settings?key=cutoffTime` is no longer blocked by admin+MFA middleware.
- Updated `app/api/settings/route.ts` so only public-safe keys bypass `requireAdminMfa()`.
- Current public-safe settings key set: `cutoffTime`.

### `phase-0-mobile-logout`

- Added shared client helper `lib/client-logout.ts`.
- Updated dashboard mobile logout to use the shared helper instead of only deleting `localStorage.user`.
- Updated existing working logout paths in `components/user-nav.tsx` and `app/admin/page.tsx` to use the same helper.
- Shared logout behavior is now:
  - clear admin MFA cookie
  - clear `user`
  - clear `isAuthenticated`
  - call `signOut({ redirect: false })`

## Phase 0 Extension: Public Page / Public-Read Audit

### Public Pages

Public pages in the current app router surface:

- `/`
- `/starter`
- `/daily-delivery`
- `/weekly-meal`
- `/faq`
- `/how-it-works`
- `/mealrating`
- `/bgm`
- `/editmusic`
- `/social-media`
- `/referral`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/reset-password-code`
- `/verify-email`
- `/verify-email-sent`
- `/unsubscribe`

Non-public pages excluded from this audit:

- `/dashboard`
- `/address`
- `/admin`
- `/admin/mfa`
- `/maintain`

### APIs Called By Public Pages

All public pages inherit these shared client-side API reads from the root layout:

```text
shared_on_all_public_pages	api
root layout -> AppInitializer	GET /api/auth/me
root layout -> MaintenanceProvider	GET /api/maintenance/status
```

Page-specific public page API map:

```text
page	page_specific_api_calls
/	none beyond shared layout reads
/starter	none beyond shared layout reads
/daily-delivery	GET /api/dishes; GET /api/days/active-with-combos; GET /api/days?isActive=true; GET /api/days/[dayId]/combos; GET /api/settings?key=cutoffTime
/weekly-meal	GET /api/weekly-subscription/user
/faq	none beyond shared layout reads
/how-it-works	none beyond shared layout reads
/mealrating	GET /api/meal-rating/active-date; GET /api/meal-rating/dishes; POST /api/meal-rating
/bgm	GET /api/music-videos; POST /api/music-submissions
/editmusic	GET /api/music-videos; POST /api/music-videos; GET /api/music-submissions; PATCH /api/music-submissions
/social-media	none beyond shared layout reads
/referral	none beyond shared layout reads
/login	GET /api/auth/me
/signup	POST /api/auth/send-verification-code
/forgot-password	POST /api/auth/request-password-reset
/reset-password	POST /api/auth/reset-password
/reset-password-code	POST /api/auth/verify-reset-code; POST /api/auth/reset-password; POST /api/auth/request-password-reset
/verify-email	POST /api/users; GET /api/auth/me
/verify-email-sent	POST /api/auth/send-verification-code; POST /api/users; GET /api/auth/me
/unsubscribe	POST /api/users/unsubscribe
```

### Public-Read / Middleware Mismatch Findings

This audit found only two routes in the target bug class:

```text
route	public_page_consumer	root_cause	status
GET /api/settings?key=cutoffTime	/daily-delivery (also reused in public-facing ordering UI)	middleware treated /api/settings as admin+mfa regardless of safe key	fixed
GET /api/weekly-subscription/user	/weekly-meal	middleware treated /api/weekly-subscription/user as auth-required even though GET is a safe public read	fixed
```

No additional middleware-only public-read mismatches were found in the current public-page API surface.

### Important Near-Misses (Not This Exact Class)

These are worth tracking, but they are not the same middleware mismatch class:

- `GET /api/maintenance/status` is public and used globally, but the route creates missing settings on read. That is acceptable for now, but unusual for a public GET.
- `/editmusic` is currently a public page that drives admin-only APIs like `GET /api/music-submissions` and `POST /api/music-videos`. That is a page-access / feature-exposure issue, not a middleware-blocked safe-public-GET issue.
- `/bgm` attempts admin-only `POST /api/music-videos` in some fallback flows. That is a write-path design issue, not a public-read middleware mismatch.

### Smallest Grouped Fix Set For This Class

The smallest fix set for the Phase 0 public-read / middleware-mismatch class is:

1. Keep a single shared classifier for safe public GET exceptions.
2. Ensure middleware uses that classifier for both admin-path and auth-required-path checks.
3. Ensure route handlers match the same public-read policy.
4. Current approved safe public GET exceptions:
   - `GET /api/settings?key=cutoffTime`
   - `GET /api/weekly-subscription/user`

### Stabilization Conclusion

For the specific Phase 0 bug class "public page calls a safe public GET, but middleware blocks it", the public surface is currently stabilized after the two fixes above.

## Root-Cause Category: CSP / Security-Header Over-Hardening

CSP or related browser security headers, applied during the hardening pass, can block legitimate frontend features that rely on third-party embeds or external scripts. When the default CSP restricts `script-src` and omits `frame-src`/`child-src` for external domains, pages that load external scripts or embed iframes (e.g., YouTube) will fail without path-specific exemptions.

### Affected Pages / Features

| Page/Feature | Third-party usage | CSP impact | Status |
|--------------|-------------------|------------|--------|
| `/bgm` | YouTube iframe embed (`youtube.com/embed/*`) + YouTube IFrame API script (`youtube.com/iframe_api`) + `img.youtube.com` thumbnails | Default CSP blocks script and frame; player blank | **PROVEN** — fixed with `/bgm`-specific CSP exemption |
| `/editmusic` | `img.youtube.com` thumbnails only; no iframe or external script | `img-src 'self' data: https:` allows HTTPS images | **LIKELY OK** — no iframe; thumbnails work |
| `/referral` | Vercel Analytics (commented out) | N/A | **UNVERIFIED** — not active |
| Other pages | `framer-motion` (bundled), `Inter` font (self-hosted via next/font) | No external loads | **OK** |

### Current CSP Configuration

- **Default (all pages except `/bgm`)**: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`; no `frame-src`/`child-src` for external domains (effectively `default-src 'self'`). Blocks external scripts and iframes.
- **`/bgm` exemption**: Adds `https://www.youtube.com`, `https://s.ytimg.com` to `script-src`; adds `frame-src` and `child-src` for `youtube.com` and `youtube-nocookie.com`.

### Proven vs Likely vs Unverified

- **PROVEN**: `/bgm` — blank player until BGM-specific CSP exemption.
- **LIKELY OK**: `/editmusic` — thumbnails only; no known CSP block.
- **UNVERIFIED**: Future features (analytics, maps, reCAPTCHA, Stripe.js, inline video preview on `/editmusic`) — would require targeted CSP updates.

### What to Audit Next

1. **Before adding any new third-party integration** (analytics, maps, payments, captcha): Confirm required `script-src`, `frame-src`, `connect-src` (and `img-src` if applicable) and add path-specific CSP exemptions in middleware.
2. **If `/editmusic` gains inline video preview**: Add YouTube `frame-src`/`script-src` for `/editmusic` (it is already admin-only; can share or mirror BGM exemption).
3. **Enabling Vercel Analytics on `/referral`**: Add `script-src` and `connect-src` for Vercel domains per their docs.
4. **Optional**: Document the path-based CSP exemption pattern (e.g. `isBgmPage`-style check) for consistency when adding future third-party integrations.


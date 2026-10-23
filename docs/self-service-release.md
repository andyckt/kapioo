# Customer order self-service release

Release scope: **Cancel order**, **Cancel entire group**, and **Change address** in customer order history and order details.

## Source and checks

- Release branch: `codex/self-service-live`, source commit `3a385e4`.
- Based on the currently published source, `d071ab77856020fe9fecce55dd995e99bf6b4156`, so existing payment correction and daily minimum exceptions remain intact.
- The release is kept in the attached `self-service-live` worktree. Unfinished homepage, ordering-page design, catering, and chatbot changes in the original workspace are not included.
- **160 tests passed across 14 suites**, including cancellation/refund concurrency, cutoff/DST boundaries, address coverage, action visibility, admin paths, current payment approval/reconciliation, and daily minimum exceptions.
- An existing test used an exception that expired in September; its clock is now fixed to its intended September scenario. Application exception behavior is unchanged.
- Separate TypeScript checking reported 231 existing diagnostics and **none in the release's changed files**. The existing project build skips its TypeScript/lint gates.
- Production read-only readiness check passed: database `kapioo`, transaction support, required unique/TTL indexes, and the **11:59 Toronto** cutoff.
- The existing verified Google key is configured as `GOOGLE_GEOCODING_API_KEY` in Production. Daily coverage uses the current polygon; weekly coverage uses the current FSA list.

## Launch record

Published **October 20, 2026** at [My Orders](https://www.kapioo.com/dashboard?tab=orders).

- Production deployment: `dpl_G54TyNuP8cunzHJ7fHsoSmUCwFLA`.
- Deployment URL: `https://kapioofirstversion-iofhtk7np-kamtocheung1104-gmailcoms-projects.vercel.app`.
- `NEXT_PUBLIC_SELF_SERVICE_ENABLED=true` is saved in Vercel Production and included in the successful Production build.
- The build was first deployed without moving the domain. After its checks passed, it was promoted and `www.kapioo.com` was verified to resolve to this exact deployment.
- Authenticated checks passed on both the staged Production URL and the public domain: normal customer sign-in, enabled self-service, dashboard access, daily/weekly history, real deployed Google address verification, missing-order ownership checks, and cross-origin rejection.
- Browser verification confirmed the live My Orders sign-in flow.
- Each Production check used an empty, zero-balance temporary account. The accounts were removed afterward; no orders, refunds, or change operations were created.

The production build uses Vercel Production settings directly. It does not inherit the isolated preview database, test authentication secrets, or disabled integration overrides.

## Customer behavior

Customers open **My Orders** and select an eligible delivery. Cancellation shows every affected delivery and the exact original voucher/credit return. Weekly cancellation applies to the complete group only and closes at the earliest delivery's cutoff, even when a delivered or past-due order still says Confirmed.

Address changes require the new address to be covered by every selected order's service. Customers review the affected deliveries before confirming. Saving the address for future orders is optional and starts unchecked.

Controls disappear for cancelled/refunded orders and after their cutoff. Address changes on later weekly deliveries remain available until those deliveries' own cutoffs. Ambiguous historical dates, incomplete groups, and uncertain deductions require staff review.

The release keeps the existing customer support email (`kapioomeal@gmail.com`) as its fallback. The separate chatbot and support-ticket workspace changes are not published in this release.

## Pausing customer changes

Set `NEXT_PUBLIC_SELF_SERVICE_ENABLED=false` in Production and rebuild this release. The flag is required at build time and controls both the customer UI and customer endpoints.

Keep the release's refund/group integrity guards, completed operations, transactions, and audit records intact. Once customer refunds have occurred, prefer disabling the flag on this release over restoring older code that lacks those guards.

Pre-release deployment reference: `dpl_BWZF8NxzjPW3sJQwEAmCRfvEGB35` / `kapioofirstversion-g7c1ewqr5-kamtocheung1104-gmailcoms-projects.vercel.app`.

## Independent cancellation deadline — October 21, 2026

Admin → Settings → Cancellation Deadline now stores `cancellationTime` independently from `cutoffTime`. Missing values default independently to 11:59 Toronto time on the day before delivery; changing one never changes the other. The live ordering value was verified at **23:59** and preserved. Only the missing cancellation setting was initialized to **11:59**, with an audit entry. Ordering and address changes continue to use `cutoffTime`. Weekly cancellation uses the earliest delivery's cancellation deadline, with all existing group/refund safeguards.

Cancellation preview, confirmation, and button visibility all use the independent setting. Confirmation rechecks the deadline; changing the cancellation time invalidates an old cancellation preview. Invalid settings fail closed for the affected operation only. The setting accepts whole-minute times from 00:00 to 23:59, requires admin MFA, and records edits in the audit trail. Setup creates missing defaults only and preserves all existing settings.

Validation: 77 focused tests passed across six suites; isolated admin sign-in/MFA, save/reload, independent ordering value, and midnight verified in the browser; setup reruns preserve custom values and create no financial transactions. TypeScript checking still reports the same 231 pre-existing diagnostics, with none in changed files.

Published source `f3ca6db` as Production deployment `dpl_k3aMWCqn3QxPY6pb2afeLzZQkC8q`, [deployment URL](https://kapioofirstversion-imwypp4md-kamtocheung1104-gmailcoms-projects.vercel.app). Production build passed and the staged version passed authenticated customer sign-in, admin-only cancellation-setting access, history, address verification, ownership, and cross-origin checks. The live domain was then promoted and verified to point to this exact deployment. The same authenticated checks subsequently passed on `https://www.kapioo.com`, including denial of cancellation-setting access to ordinary customers. Both empty test accounts were removed; no orders, refunds, or change operations were created.

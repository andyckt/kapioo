# Kapioo support and sales assistant

## Staff use

Open **Admin → Support & Leads → Preview assistant** for a private preview. Public chat and AI replies start disabled. Customers need no account to browse, ask questions, choose a plan, or request an email reply. Personal orders still require account authentication.

The assistant has English/Chinese controls, current menu/price links, a guided plan chooser, delivery address checking, shared FAQs, and an optional consent-based follow-up form. Recommendations show one suggested plan and one alternative, with server-calculated CAD meal, delivery, tax, and total amounts. Selected plans and verified address prefills survive signup/login; customers review the address in the existing checkout form.

In **Inbox**, filter support requests or purchase enquiries. Take over a conversation to pause AI, reply by website/email, change its support status, or update its lead stage. Only **Resume assistant** turns AI back on for that conversation. Email replies use the existing email service and a seven-day conversation-only return link. A failed email is marked in the conversation; the website reply remains saved. Follow-up forms never send automatic marketing email.

While waiting for staff, every visitor message receives a saved receipt explaining that automatic replies are paused. **New chat** starts a separate enquiry without resuming or removing the team conversation; **Previous chat** returns to the last conversation on that browser. Greetings and recognized general English/Chinese questions use published FAQ answers without an AI call, including when AI is disabled. Other free-form questions still require the configured AI service or the team.

Use **Knowledge** to save bilingual drafts, preview them, and publish both languages. Published answers feed the widget and FAQ page. Coverage, cutoff, product prices, and available menus are read from operational settings/catalogues. Review open conversations for unanswered questions. **Results** distinguishes recommendations, checkout starts, follow-up requests, approved chat-assisted purchases, and first-ever meal orders. Purchases use a signed seven-day attribution reference and are counted once at payment approval.

## Configuration and rollout

Keep secrets on the server. The new settings are:

| Setting | Default / purpose |
| --- | --- |
| `SUPPORT_PUBLIC_ENABLED` | Unset/false: chat limited to administrators with MFA. Set `true` to expose the widget publicly. |
| `NEXT_PUBLIC_SELF_SERVICE_ENABLED` | Unset/false: customer order controls hidden; admins can preview. Set `true` **at build time** for customer rollout. |
| `SUPPORT_AI_ENABLED` | Unset/false: deployment-level AI switch. Guided help remains available. |
| `OPENAI_API_KEY` | Required only for AI replies; never sent to the browser. |
| `SUPPORT_AI_MODEL` | `gpt-5.4-mini`. |
| `SUPPORT_AI_INPUT_USD_PER_MILLION` / `SUPPORT_AI_OUTPUT_USD_PER_MILLION` | Both required when overriding the model. Initial model rates are US$0.75 input / US$4.50 output per million tokens; review before changing models. |
| `GOOGLE_GEOCODING_API_KEY` | Server-side Google Geocoding key used to resolve selected place IDs and verify coverage. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Existing address autocomplete browser key. |
| `NEXT_PUBLIC_BASE_URL` | Existing public website URL used in support email links. |

The existing `MONGODB_URI`, `AUTH_SECRET`, admin MFA, and email service configuration are reused. MongoDB must support multi-document transactions (replica set / Atlas). Support does not fall back to non-transactional order changes.

1. Configure the server geocoding key and existing browser address picker. Configure the email service and verify the public base URL. Public AI additionally requires an OpenAI key.
2. Run `npx tsx scripts/setup-support.ts` against the intended database to create collections and unique/TTL indexes. This does not migrate historical orders or change balances.
3. Keep public flags off and preview as an MFA-verified admin. Review the bilingual knowledge, address coverage, quoted totals, staff reply email delivery, and real-model responses privately. AI additionally needs **Admin → Support & Leads → AI settings → Enable AI replies**; its initial monthly limit is **US$30**.
4. Run the checks below. Enable customer self-service at build time and public chat when ready. Enable public AI only after the private model checks pass. Customer order self-service was released on October 20, 2026; the separate chatbot/support release remains unpublished. See [the self-service release record](./self-service-release.md).
5. To pause AI, turn off the admin switch or `SUPPORT_AI_ENABLED`. FAQ answers, guided plan selection, checkout links, customer self-service, and staff support remain available.

### Customer order self-service setup

For a cancellation/address-only release, use the narrower setup command instead of initializing the whole support assistant:

```sh
# Read-only: verify the database name, transaction support, cutoff, and indexes.
npx tsx scripts/setup-self-service.ts --database=kapioo

# Add required indexes and missing deadline defaults only.
# Existing settings, orders, and balances are never modified.
npx tsx scripts/setup-self-service.ts --database=kapioo --apply
```

The setup is repeat-safe, never drops indexes, and audits newly initialized deadlines. It preserves both existing settings; use Admin Settings to change them. An unexpected database name or missing transaction support aborts setup. On October 21, 2026, ordering was verified at **23:59 Toronto time** and preserved; the independent cancellation setting starts at **11:59 Toronto time**. Required unique/TTL indexes were verified.

The existing Google Maps key successfully resolved public Canadian addresses from the server and supplied real browser autocomplete suggestions. With the owner's approval, it was saved as `GOOGLE_GEOCODING_API_KEY` in local and Vercel Preview/Production configuration on October 20, 2026. The starter page and order changes share `AddressAutocomplete` and `resolveServiceability`; coverage remains defined in the existing daily polygon and weekly FSA files. Order changes additionally verify the selected place on the server and require coverage for every selected order. The public self-service flag was enabled in Production on October 20, 2026.

Before public rollout, deploy the reviewed source to a protected HTTPS preview with isolated test data and `NEXT_PUBLIC_SELF_SERVICE_ENABLED=true`, then verify sign-in, address review/confirmation, and cancellation there. This check passed on October 20, 2026 at the [protected self-service preview](https://kapioofirstversion-m577ay4w1-kamtocheung1104-gmailcoms-projects.vercel.app). It uses a separate sample-only database, a separate authentication secret, and disabled email/AI integrations. Vercel authentication remains required.

**Do not promote that test deployment to production:** it intentionally uses test database and environment overrides. A fresh production deployment was built from the current live source plus the isolated self-service changes, using Production settings and `NEXT_PUBLIC_SELF_SERVICE_ENABLED=true`. The project's ordinary Preview database setting still points at production; always override it with an isolated database for destructive tests. Changing the public flag requires a new build. To pause customer changes, rebuild the release with the flag false while keeping its refund/group integrity guards; completed refunds and audit records must remain intact. See [the release record](./self-service-release.md) for the live deployment and source branch.

The monthly budget uses Toronto calendar months and integer micro-dollars. Every Responses API call, including a tool follow-up, reserves its maximum estimated cost atomically across all instances. Reported usage settles the reservation. Timeouts, unknown billing results, or process failure retain the reservation; there is no automatic release or unbudgeted retry. Admin shows both actual and reserved amounts. This cap covers this assistant's requests, not unrelated OpenAI projects or older AI features elsewhere in the application.

## Order changes and operational boundaries

Customers review exact affected deliveries and voucher/credit refunds before confirmation. Confirmation rechecks ownership, dates, cutoff, dispatch, status, group completeness, and original deductions inside a transaction. Persisted operation IDs make repeat confirmations safe. An expired or changed preview requires a new review.

Daily cancellation refunds its entire original voucher deduction. Weekly cancellation refunds the original group entitlement once and cancels every child order. New single-delivery weekly orders also receive a one-member group. Group retries cannot reopen a cancelled group, exceed its meal allocation, or deduct the voucher twice. Existing admin paths cannot cancel/delete individual group members; staff can use the same group review controls on an authenticated customer's linked order in the support inbox.

Admin → Settings → Cancellation Deadline controls cancellation independently through `cancellationTime` (default 11:59am Toronto). Ordering and address changes continue to use `cutoffTime`. The weekly group's cancellation deadline is the cancellation time on the day before its **earliest delivery**. Once that deadline is reached, cancellation from any member is blocked and no group vouchers or credits are restored, even if the first delivery still says Pending or Confirmed because staff have not updated it. Preview and confirmation both recheck dates. The dialog shows one group deadline instead of separate deadlines that could imply the later delivery can still be cancelled independently.

Order lists and details hide actions at their deadlines, including while the page stays open. Weekly cancellation uses all group members, including deliveries outside the displayed history page. A later weekly delivery can still show **Change address** until its own cutoff, even after group cancellation closes. Missing or ambiguous dates and incomplete groups do not expose cancellation controls.

Address changes validate coverage for every selected order and replace complete address/coordinate snapshots, including clearing stale address overrides. **Also save for future orders** starts unchecked. Existing delivery exports consume the updated effective address. Changes and refund references are recorded in the audit trail.

Self-service coverage is strict: Daily Bento uses the configured delivery polygon and Weekly Meal Box uses the carrier FSA list. City-name fallbacks are not allowed. Selecting both services requires their intersection; unsupported selections reject the whole change. Server-verified address data is required, and current coverage is checked again during confirmation.

Review comparisons ignore generated meal-item IDs that may be absent from older/imported records, while retaining the meal data, order timestamps/statuses, group information, refund amounts, and cutoff. Genuine changes or expired previews require **Review latest details** and a new customer confirmation. Refreshing never cancels an order automatically.

Historical dates without a year, incomplete groups, inconsistent meal allocations, uncertain deductions, late/dispatched orders, cash refunds, and exceptions require staff review. There is no automatic historical-data backfill. New orders snapshot unambiguous current published schedule dates separately from existing display labels, preserving the export format. Unrecognized/stale schedule labels continue to require review.

## Verification

```sh
npx vitest run \
  __tests__/unit/support-policy.test.ts \
  __tests__/unit/support-assistant.test.ts \
  __tests__/integration/customer-self-service.test.ts \
  __tests__/integration/support-budget.test.ts \
  __tests__/integration/support-conversations.test.ts \
  __tests__/integration/daily-order-route.test.ts \
  __tests__/integration/weekly-order-route.test.ts \
  __tests__/integration/admin-daily-order-routes.test.ts \
  __tests__/integration/admin-weekly-order-routes.test.ts \
  __tests__/integration/voucher-auto-approval.test.ts \
  __tests__/integration/etransfer-reconcile.test.ts
```

Integration tests use disposable local MongoDB replica sets, mocked email/model services, and test customers. They do not mutate the live database or make paid model calls. Coverage includes concurrent/refunded confirmations, rollback, Toronto cutoff/DST boundaries, coverage checks, address overrides, guest isolation, staff takeover during a pending AI call, explicit consent, publication visibility, email-token isolation/expiry, budget concurrency/outages, read-only tool restrictions, fabricated product/source rejection, checkout continuation, and approved-purchase deduplication.

Mobile and desktop widget behavior is checked with AI disabled. Live OpenAI quality evaluation and real email delivery remain launch checks for the support assistant; real Google verification for customer order changes passed as recorded below. Repository-wide TypeScript checking currently reports unrelated existing errors; the modified and added support/order files are checked separately in its output.

Initial implementation verification: **71 tests passed across 11 targeted suites**, the production build passed in an isolated workspace with a disposable database, and TypeScript reported **no errors in changed or added files**. The existing build configuration skips its TypeScript/lint gates; that whole-repository type check reported 231 errors outside those files. Browser checks covered English/Chinese, a 390px mobile viewport, FAQ browsing, optional contact consent, AI-disabled fallback, and keyboard dismissal. Unrelated workspace edits were preserved.

Chat reply follow-up: **41 tests passed across four focused suites**, covering bilingual direct answers, staff-message receipts and deduplication, concurrent takeover, separate conversations, privacy, and budget enforcement. Browser verification confirmed greeting/product replies with AI disabled, a visible team receipt, and returning between the original team conversation and a new chat. The follow-up type check found no errors in its changed files; existing repository errors remain.

Customer order release checks (October 20, 2026): **123 tests passed across 11 focused suites**, covering whole-group and repeated cancellation, rollback, cutoff/DST boundaries, action visibility, ownership, strict daily/weekly coverage, saved addresses, overrides, and existing admin/order paths. The production build passed locally and on Vercel. Real Google + authenticated production HTTP checks passed for Toronto overlap, Hamilton weekly-only coverage, Ottawa rejection, mixed-selection rejection, optional profile saving, untouched unselected orders, cross-origin/unauthenticated/other-customer rejection, and daily/weekly refund deduplication. The same checks then passed on the protected HTTPS preview, including secure-session acceptance by the deployed page middleware. The setup script passed read-only and repeat-apply tests with one audit entry and no financial transactions. The preview uses Vercel's authentication host defaults; do not add empty `AUTH_URL` overrides, which prevent the authentication library from recognizing the trusted deployment host.

Browser checks used real Google suggestions and an isolated test account. They verified keyboard address selection, a successful weekly-only address change, an unchecked-by-default future-address option, a readable 390px group confirmation showing the earliest cutoff, whole-group cancellation, and hidden actions on both refunded deliveries. The address picker now supports arrow keys, Enter, Escape, and a visible retry state on failed place selection. The final separate TypeScript check found no errors in the changed self-service/address-picker files; 227 unrelated repository errors remain.

Independent deadline checks (October 21, 2026): 77 focused tests across six suites passed, covering earlier/later cancellation times, weekly earliest-delivery enforcement, confirmation rechecks, independent action visibility, invalid values, admin-only access, and audit records. Admin save/reload and midnight were verified in an isolated browser preview. Setup reruns preserve existing deadlines.

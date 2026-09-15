# Interac e-Transfer voucher approval

This feature verifies completed Interac deposits in the Kapioo Gmail mailbox and approves matching daily or weekly voucher requests. It starts disabled. Existing requests are never enrolled automatically.

Every new Interac request records the payer email and optional transfer reference, including while automation is disabled, so manual approvals receive the same one-payment protection during rollout.

Customers may verify up to three Interac sender emails by entering a six-digit code sent to each address. One sender email can belong to only one Kapioo account. A request using an unverified address is accepted for manual review, so email verification can never block the request itself.

Customers may submit when they cannot find the transfer reference. A verified sender email can still qualify for automatic approval without the reference, but only when exactly one unallocated deposit and one unambiguous voucher entitlement match. Otherwise it stays pending for review.

## Safety rules

A request is approved only when one Gmail-authenticated Interac receipt matches all applicable values exactly:

- verified payer email linked to the same Kapioo account
- amount in Canadian cents
- Kapioo recipient mailbox
- destination bank account's last four digits
- activation date and request date
- transfer reference, when the customer supplied one

The receipt, approval grant, balance change, transaction record, audit log, and notification record are committed together in one MongoDB transaction. Unique database indexes allow one approval per request and one allocation per payment. A duplicate ticket carrying an already allocated transfer reference is declined without issuing another voucher. A reference-free request never reuses an allocated receipt and stays pending until another completed deposit arrives or an administrator reviews it. Two reference-free requests for different products are treated as ambiguous and neither is approved. Missing, unauthenticated, conflicting, old, or mismatched evidence never issues vouchers and is sent to manual review.

Manual approval requires the actual Interac transaction reference from the bank receipt. A made-up reference based on the request ID is prohibited because it would allow two duplicate requests to look like two payments.

The first check is scheduled about 10 minutes after submission. A missing completed deposit is checked every 15 minutes for the first 24 hours and hourly after that. After 72 hours it is highlighted for manual review, while checks continue so a bank transfer that completes later can still be approved.

The mailbox is scanned on every scheduled run even when there is no voucher request waiting. Completed deposits without a request appear in the admin payment monitor as unmatched money. A rejected or changed email format stops the entire approval run and raises an operator-visible error; no request is approved during that run.

## Recommended long-term payment path

Gmail parsing is an interim integration. The preferred production design is an Interac Business Request Money or payment-provider API that gives Kapioo a provider transaction ID, signed webhook or authenticated status API, and a direct link between the request and payment. A unique Autodeposit recipient email per customer is also strong, but it requires bank or payment-provider provisioning; ordinary Gmail aliases do not create additional Interac Autodeposit recipients.

The linked-email flow remains useful as an identity check and fallback. It should not replace the provider transaction ID when a supported banking API is available.

## Required environment variables

Set these in the deployed app. Use a Gmail app password for `EMAIL_PASS`; never use the normal Google account password.

```text
EMAIL_USER=kapioomeal@gmail.com
EMAIL_PASS=<gmail-app-password>
ETRANSFER_RECIPIENT_EMAIL=kapioomeal@gmail.com
ETRANSFER_ACCOUNT_LAST4=<four-digits>
ETRANSFER_CRON_SECRET=<random-secret-at-least-32-characters>
ETRANSFER_AUTO_APPROVAL_MODE=off
ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT=<ISO-8601-timestamp>
```

`off` is the emergency stop and the deployment default. `observe` reads and matches receipts without adding vouchers. `live` enables automatic approval. A misspelled mode is treated as `off`. New requests stay on the manual path unless every mailbox field, the destination account digits, activation time, and a scheduler secret of at least 32 characters are present.

## Deployment sequence

1. Deploy with `ETRANSFER_AUTO_APPROVAL_MODE=off`.
2. Run `npm run setup:etransfer` against the production database. Do not continue if any index fails.
3. Configure an external scheduler to send `POST /api/cron/reconcile-etransfers` every five minutes with `Authorization: Bearer <ETRANSFER_CRON_SECRET>`. Treat any non-2xx response as a failed run and alert an operator.
4. Set a new UTC activation timestamp and change the mode to `observe`.
5. Keep observation mode until it has inspected at least 30 real completed deposits over at least seven days, including a late transfer, a duplicate request, an unmatched deposit, a reference-free request, and both daily and weekly purchases. Compare every result with the bank and request records. Observation-mode requests remain manual.
6. Do not enable live mode unless there are zero false matches, zero missed duplicate protections, every parser rejection produced an alert, and every unmatched deposit appeared in the admin monitor.
7. Immediately before going live, set `ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT` to the live cutover time. This limits live processing to requests created after the cutover.
8. Enable `live` for controlled staff test purchases first. Submit one daily request and one weekly request. Confirm the amount, customer balance, one accounting transaction, one approval grant, one email, and the allocated receipt.
9. Review the payment monitor daily during the first week. Expand to normal traffic only after the controlled results remain exact.

If any discrepancy appears, set the mode back to `off`. Requests remain pending for manual handling; disabling the worker does not reverse or repeat completed grants.

## Gmail requirements

IMAP must be available for the Gmail account. The worker opens Gmail's All Mail folder read-only and never marks, moves, or deletes messages. Keep the mailbox app password only in deployment secrets and rotate it if it is exposed.

The parser deliberately accepts only the completed automatic-deposit receipt format from `notify@payments.interac.ca` with Gmail-reported DKIM, SPF, and DMARC passes for the Interac domain. A format change will stop approvals and create rejection audit entries until the parser is reviewed and updated.

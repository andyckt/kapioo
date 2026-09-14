# Interac e-Transfer voucher approval

This feature verifies completed Interac deposits in the Kapioo Gmail mailbox and approves matching daily or weekly voucher requests. It starts disabled. Existing requests are never enrolled automatically.

Every new Interac request records the payer email and transfer reference, including while automation is disabled, so manual approvals receive the same one-payment protection during rollout.

## Safety rules

A request is approved only when one Gmail-authenticated Interac receipt matches all of these values exactly:

- transfer reference
- payer email
- amount in Canadian cents
- Kapioo recipient mailbox
- destination bank account's last four digits
- activation date and request date

The receipt, approval grant, balance change, transaction record, audit log, and notification record are committed together in one MongoDB transaction. Unique database indexes allow one approval per request and one allocation per payment. A duplicate ticket for an already allocated transfer is declined without issuing another voucher. Missing, unauthenticated, conflicting, old, or mismatched evidence never issues vouchers and is sent to manual review.

The first check is scheduled about 10 minutes after submission. A missing completed deposit is checked every 15 minutes for the first 24 hours and hourly after that. After 72 hours it is highlighted for manual review, while checks continue so a bank transfer that completes later can still be approved.

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
5. Keep observation mode for at least 48 hours. Compare every recorded match, mismatch, delayed transfer, and duplicate with the Gmail receipt and the admin request. Observation-mode requests remain manual.
6. Immediately before going live, set `ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT` to the live cutover time. This limits live processing to requests created after the cutover. Change the mode to `live` only after the observation results are exact.
7. Submit one controlled daily request and one controlled weekly request. Confirm the amount, customer balance, one accounting transaction, one approval grant, one email, and the allocated receipt before accepting normal traffic.

If any discrepancy appears, set the mode back to `off`. Requests remain pending for manual handling; disabling the worker does not reverse or repeat completed grants.

## Gmail requirements

IMAP must be available for the Gmail account. The worker opens Gmail's All Mail folder read-only and never marks, moves, or deletes messages. Keep the mailbox app password only in deployment secrets and rotate it if it is exposed.

The parser deliberately accepts only the completed automatic-deposit receipt format from `notify@payments.interac.ca` with Gmail-reported DKIM, SPF, and DMARC passes for the Interac domain. A format change will stop approvals and create rejection audit entries until the parser is reviewed and updated.

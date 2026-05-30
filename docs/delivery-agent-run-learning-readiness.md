# DeliveryAgentRun — Learning Readiness Assessment

**Date:** 2026-05-28  
**Scope:** Inspect existing M4 model/helpers only. No schema changes, no UI, no route planning, no historical learning implementation.

**Sources reviewed:**
- [`models/DeliveryAgentRun.ts`](../models/DeliveryAgentRun.ts)
- [`lib/agents/delivery/run-log-types.ts`](../lib/agents/delivery/run-log-types.ts)
- [`lib/agents/delivery/run-log.ts`](../lib/agents/delivery/run-log.ts)
- [`lib/integrations/route-optimizer/types.ts`](../lib/integrations/route-optimizer/types.ts) (future stop/run shapes)

---

## 1. Current model summary

### Core identity

| Field | Type | Purpose today |
|-------|------|---------------|
| `deliveryDate` | `string` | ISO `YYYY-MM-DD` delivery date anchor |
| `profileId` | `string` | Planning profile identifier (e.g. `daily-default`) |
| `planningSessionId` | `string` | UUID for one agent attempt / RO planning session |
| `duplicatePreventionKey` | `string` | Unique key `daily-delivery-agent:{date}:{profileId}` |

### Trigger and lifecycle

| Field | Type | Purpose today |
|-------|------|---------------|
| `triggeredBy` | `string?` | Admin user id/email (when available) |
| `triggerSource` | `"manual" \| "cron" \| "test"` | How the run was started |
| `startedAt` | `Date?` | Optional start timestamp |
| `completedAt` | `Date?` | Set when marked failed |
| `createdAt` / `updatedAt` | `Date` | Mongoose timestamps |

### Agent workflow status

| Field | Type | Values |
|-------|------|--------|
| `status` | enum | `draft`, `previewing`, `ready_for_review`, `created`, `failed`, `cancelled` |

This tracks **agent/RO pipeline state**, not Donald’s human review outcome.

### Order snapshot (order-ID-centric)

| Field | Type | Purpose today |
|-------|------|---------------|
| `orderCount` | `number` | Total orders in snapshot |
| `validStopCount` | `number` | Routable stops |
| `invalidStopCount` | `number` | Blocked stops |
| `warningCount` | `number` | Stops with warnings |
| `orderIds` | `string[]` | Join keys only |
| `invalidOrders` | subdoc[] | `{ orderId, mongoId?, area?, errors[] }` |
| `warnings` | subdoc[] | `{ orderId, warnings[] }` |

No lat/lng, formatted address, cluster id, or location-normalized keys in the snapshot.

### Planning (partial, flexible)

| Field | Type | Purpose today |
|-------|------|---------------|
| `selectedPlanSummary` | `Mixed` | Human/agent summary of chosen plan (unstructured) |
| `profileSnapshot` | `Mixed` | Profile config at decision time (unstructured) |
| `candidateCount` | `number?` | How many candidates were considered (count only) |
| `previewCount` | `number?` | How many previews were run (count only) |

### Route Optimizer linkage (minimal)

| Field | Type | Purpose today |
|-------|------|---------------|
| `routeOptimizerPlanningSessionId` | `string?` | RO-side planning session id |
| `routeOptimizerRuns` | subdoc[] | `{ runId, driverName, externalId, idempotencyKey, detailsLink?, driverLink?, estimatedFinishTime?, totalDurationMinutes? }` |

No optimized stop sequence, geocodes, fixed positions, synthetic stops, or run geometry stored here.

### Errors and metadata

| Field | Type | Purpose today |
|-------|------|---------------|
| `errors` | subdoc[] | `{ code, message, details?, createdAt }` — failure log, not retry/rejection history |
| `notes` | `string?` | Freeform notes |
| `version` | `string?` | **Schema/log format version** (default `m4-v1`), not planning profile version |

### Indexes

- Unique: `duplicatePreventionKey`
- Query: `deliveryDate`, `planningSessionId`, `status`, `createdAt`

### Existing helpers

| Helper | What it writes |
|--------|----------------|
| `createDeliveryAgentRunLog` | Identity, trigger, order snapshot, default `draft` |
| `findDeliveryAgentRunByDuplicateKey` | Lookup only |
| `markDeliveryAgentRunFailed` | `status=failed`, `completedAt`, append `errors[]` |
| `markDeliveryAgentRunReadyForReview` | `status=ready_for_review`, optional plan/profile counts |
| `attachRouteOptimizerRuns` | Append RO run metadata |

No helpers yet for Donald feedback, repair actions, final accepted plan, or outcome capture.

---

## 2. Learning readiness assessment

### What M4 is good for today

M4 is a solid **audit and duplicate-prevention foundation**:

- Anchors each attempt by `deliveryDate`, `profileId`, and `planningSessionId`
- Captures order-level validation snapshot at attempt time
- Records RO run ids and links for cross-system lookup
- Provides two `Mixed` fields (`selectedPlanSummary`, `profileSnapshot`) that *could* hold richer data opportunistically

### What M4 does **not** yet support

The clarified learning goal is **location-first decision replay**:

- Stop clusters (lat/lng, normalized address, area/zone)
- How stops were split across runs
- Meet-up / handoff points
- `fixed_stop_position`, `is_end_point`, synthetic stops
- Repair action sequences before approval
- Donald’s approve / edit / reject workflow and feedback
- Final accepted plan as a replayable artifact
- Actual route outcome vs planned outcome
- Historical comparison and rule-improvement backtests

**Verdict:** M4 is **not learning-ready** as-is. It is **run-log-ready** only. You can start M5 route preview/create, but if M5 writes unstructured blobs into `selectedPlanSummary` without a agreed contract, later learning/backtest code will be harder to build and query.

### Order-ID vs location-first gap

Current snapshot fields (`orderIds`, `invalidOrders`, `warnings`) are **order-ID-first**. Learning needs **location-first** records where order ids are optional join keys. That data is not modeled anywhere on `DeliveryAgentRun` today, though Route Optimizer request/response types already expose the right stop-level fields (`lat`, `lng`, `fixed_stop_position`, `is_end_point`, `is_synthetic`, `stop_type`, etc.) for future capture.

---

## 3. Field-by-field checklist

| Field | Supported today? | Notes |
|-------|------------------|-------|
| `candidatePlansTested` | **No** | Only `candidateCount` (number). No array of candidate plans, scores, or stop assignments. |
| `selectedPlanSummary` | **Yes** | First-class `Mixed` field; helper can set via `markDeliveryAgentRunReadyForReview`. Shape not defined yet. |
| `scoreBreakdown` | **No** | Could be nested inside `selectedPlanSummary` without schema change, but not first-class or typed. |
| `agentReasoningSummary` | **No** | Same as above — no dedicated field. |
| `constraintApplicationLog` | **No** | Repair/constraint steps not stored. |
| `routeShapeIssuesDetected` | **No** | No route geometry or shape issue log. |
| `fixedStopUsage` | **No** | RO supports it on stops; model does not capture usage. |
| `endpointUsage` | **No** | RO supports `is_end_point`; model does not capture it. |
| `handoffEvents` | **No** | No meet-up / handoff event log. |
| `historicalComparison` | **No** | No comparison to past dates/clusters. |
| `reviewStatus` | **No** | Agent `status` ≠ Donald review (`approved` / `edited` / `rejected`). |
| `donaldFeedbackText` | **No** | — |
| `donaldFeedbackTags` | **No** | — |
| `manualEdits` | **No** | — |
| `profileVersion` | **Partial** | `profileId` exists; `profileSnapshot` Mixed could hold version internally. Top-level `version` is **log schema version** (`m4-v1`), not profile version. |
| `improvementSuggestions` | **No** | — |
| `approvedRuleChanges` | **No** | — |
| `actualOutcome` | **No** | No post-delivery outcome linkage. |
| `retryHistory` | **No** | `errors[]` logs failures, not structured retry/repair attempts. |
| `rejectionHistory` | **No** | — |
| `finalAcceptedPlan` | **No** | No field for the plan Donald ultimately accepted. |

**Summary:** **1 fully supported**, **1 partial**, **17 missing** from the requested learning field set.

---

## 4. Missing fields (grouped by learning workflow stage)

### Candidate generation and preview

- `candidatePlansTested[]` (plans with location clusters, run splits, scores)
- `scoreBreakdown`
- `agentReasoningSummary`
- `routeShapeIssuesDetected`

### Repair and constraints

- `constraintApplicationLog` (fixed position, end point, synthetic meet-up, run moves, Self fallback, start-time changes)
- `fixedStopUsage`
- `endpointUsage`
- `handoffEvents`
- `retryHistory` (structured, not just `errors[]`)

### Donald review

- `reviewStatus` (human decision, separate from agent `status`)
- `donaldFeedbackText`
- `donaldFeedbackTags`
- `manualEdits`
- `rejectionHistory`

### Final plan and outcome

- `finalAcceptedPlan` (location-first, replayable)
- `actualOutcome` (what happened on the road)
- `historicalComparison` (vs past dates / clusters)

### Profile evolution

- `profileVersion` (explicit, queryable)
- `improvementSuggestions`
- `approvedRuleChanges`

---

## 5. Are existing `Mixed` fields flexible enough?

**Short answer:** Yes for **prototyping**, no for **durable learning** without a documented contract.

| Field | Flexibility | Limitation |
|-------|-------------|------------|
| `selectedPlanSummary` | Can store arbitrary JSON today | No schema contract; hard to query/index nested location clusters |
| `profileSnapshot` | Can store profile + version + drivers/zones | Same; `profileVersion` not queryable if buried inside |
| `errors[].details` | Can attach arbitrary failure context | Not a retry/repair timeline |
| `notes` | Freeform | Not structured feedback |

MongoDB `Mixed` avoids migration pain but:

- Cannot index nested lat/lng clusters for “find similar handoff decisions”
- Encourages one-off shapes per milestone unless a shared TypeScript contract is defined now
- Makes backtest jobs depend on parsing inconsistent historical blobs

**Recommendation:** Use `Mixed` for large, evolving payloads **plus** a small set of first-class fields for fields you will filter on (`reviewStatus`, `profileVersion`, `donaldFeedbackTags`, maybe `learningRecordVersion`).

---

## 6. Recommend Milestone 4B?

**Yes — recommend a small Milestone 4B** before M5 starts persisting planning data.

**Why now:**

1. **No production data yet** — additive schema change is cheapest before first real run logs are written.
2. **Learning is a first-class product requirement** — retrofitting after M5/M6 will force migrations or lossy `Mixed` blobs.
3. **Human review is a distinct lifecycle** — agent `status` already overloads “ready for review”; Donald approve/edit/reject needs its own field.
4. **Location-first replay needs a stable home** — even if stored as `Mixed`, the field names and TS contracts should exist before preview/create code writes them.

**Why keep it small:**

- Still no route planning, RO calls, admin UI, or learning jobs in 4B
- Only schema + types (+ optional no-op helper stubs if useful)
- No change to existing admin/order behavior

---

## 7. Proposed Milestone 4B — smallest safe additive schema change

### A. Add first-class review and profile fields (queryable)

```typescript
// New optional top-level fields on DeliveryAgentRun
profileVersion?: string;          // e.g. "daily-v1.2" — planning profile version, NOT log schema version
reviewStatus?: "pending" | "approved" | "edited" | "rejected";
reviewedAt?: Date;
reviewedBy?: string;              // Donald / admin id or email
donaldFeedbackText?: string;
donaldFeedbackTags?: string[];    // e.g. ["split-north-york", "needs-earlier-start"]
```

Rename/clarify existing `version` in docs as **`logSchemaVersion`** in types (keep DB field name `version` for backward compatibility) to avoid confusion with `profileVersion`.

**Optional index:** `{ deliveryDate: 1, profileVersion: 1 }` and `{ reviewStatus: 1, deliveryDate: 1 }` for future admin/history views.

### B. Add three optional `Mixed` buckets with versioned TS contracts

Define shared types in [`lib/agents/delivery/run-log-types.ts`](../lib/agents/delivery/run-log-types.ts); store as `Schema.Types.Mixed`:

| Field | Intended contents |
|-------|-------------------|
| `planningArtifacts` | `candidatePlansTested`, `scoreBreakdown`, `agentReasoningSummary`, `constraintApplicationLog`, `routeShapeIssuesDetected`, `finalAcceptedPlan` |
| `locationArtifacts` | Location-first stop snapshots: `{ lat, lng, normalizedAddress, area, clusterId?, orderIds? }`, plus `fixedStopUsage`, `endpointUsage`, `handoffEvents` |
| `learningArtifacts` | `historicalComparison`, `improvementSuggestions`, `approvedRuleChanges`, `actualOutcome`, `retryHistory`, `rejectionHistory`, `manualEdits` |

Each bucket should include an internal `artifactVersion: string` (e.g. `"learning-artifacts-v1"`) so parsers can evolve safely.

### C. Extend `routeOptimizerRuns` subdoc minimally (still additive)

Add optional fields to the existing subdoc (no new collection):

```typescript
optimizedRoute?: unknown[];       // RO stop sequence snapshot (location-first)
startLocation?: { address?, lat?, lng? };
endLocation?: { address?, lat?, lng? };
repairActionCount?: number;
```

This keeps run-level geometry with RO metadata instead of burying everything in top-level Mixed.

### D. What 4B explicitly does **not** include

- No new API routes or admin UI
- No learning/backtest jobs
- No mandatory population of new fields (all optional)
- No changes to duplicate key logic
- No changes to existing helper behavior (optional: add `recordDonaldReview()` / `attachPlanningArtifacts()` in 4B or defer to M5)

### E. Files touched in 4B (when implemented)

| File | Change |
|------|--------|
| `models/DeliveryAgentRun.ts` | Add optional fields + indexes |
| `lib/agents/delivery/run-log-types.ts` | Add learning artifact type contracts |
| `__tests__/integration/agents/delivery/run-log.test.ts` | Assert new fields persist when set |
| `docs/delivery-agent-run-learning-readiness.md` | This document (reference) |

---

## 8. Alternative: “No change needed”

Choose **no schema change** only if:

- M5 will write nothing beyond current fields for several milestones, **and**
- You accept that early run logs may be incomplete for learning/backtest, **and**
- You are willing to run a one-time migration when learning work starts.

Given the clarified product requirement, **this is not recommended**.

---

## 9. Risks

| Risk | Severity | Mitigation in 4B |
|------|----------|------------------|
| Overloading agent `status` for Donald review | Medium | Add separate `reviewStatus` |
| Unstructured `Mixed` blobs become unqueryable history | High | Named artifact buckets + `artifactVersion` + TS contracts |
| Confusing `version` vs `profileVersion` | Medium | Document + add explicit `profileVersion` |
| Mongoose reserved `errors` pathname | Low | Already using `Omit<Document, "errors">`; monitor if Document helpers conflict |
| Schema bloat before M5 | Low | All new fields optional; no helper enforcement |
| Breaking existing admin/order flows | None if 4B stays additive | No imports from existing routes |
| Capturing order-ID-only snapshots forever | High for learning | Add `locationArtifacts` before first RO preview persistence |
| Duplicate prevention blocks re-run after reject | Medium (future) | Out of 4B scope; may need key strategy change when `reviewStatus=rejected` should allow retry |

---

## 10. Conclusion

| Question | Answer |
|----------|--------|
| Is M4 sufficient for future learning? | **No** — adequate for audit/duplicate prevention only |
| Can `Mixed` fields defer everything? | **Partially** — OK for blobs, insufficient for review queries and stable replay contracts |
| Recommend 4B? | **Yes** — small additive schema + typed artifact contracts |
| Block M5 on 4B? | **Soft gate** — M5 can start if it only uses existing fields, but should not persist planning/location data until 4B fields exist |

**Next step (when approved):** Implement Milestone 4B as optional fields and types only, then proceed to M5 route preview/create with location-first artifacts written into the new buckets.

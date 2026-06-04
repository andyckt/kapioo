# COST-0A - Kapioo Admin Google API Cost Spike Inspection

## 1. Executive Summary

The highest-risk Admin-side cost paths are:

1. **Preview Candidate Routes**
   - UI: `features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
   - Can fan out to up to **15 full candidate variants**.
   - Each variant can call Route Optimizer `optimize-preview` **2-3 times**, plus repair re-previews can add **1-3 more**.
   - Worst code-level multiplier: roughly **up to 90 `optimize-preview` calls per click** before rate-limit stop, plus geocode enrichment.

2. **Generate Improved Candidate Plans**
   - UI: `features/admin-delivery-agent/delivery-agent-review-panel.tsx`
   - Reuses the same candidate preview pipeline, so it has the same preview fanout risk.

3. **Run Simple Route Preview**
   - UI: `features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
   - Lower fanout: one RO geocode batch if uncached, then one `optimize-preview`.

4. **Create Final Route Optimizer Runs**
   - UI: `features/admin-delivery-agent/delivery-agent-review-panel.tsx`
   - Calls `batch-create-and-optimize` once with usually 2-3 runs, but retries 429 twice, so up to **3 batch calls** per click.

Primary May 30/31 suspects: **Preview Candidate Routes** and **Generate Improved Candidate Plans**, especially repeated clicks during testing.

## 2. Admin Call Graph

### Generate Candidate Plans

UI:
`features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
- `handleGenerateCandidatePlans`
- `POST /api/admin/delivery-agent/generate-candidate-plans`

API route:
`app/api/admin/delivery-agent/generate-candidate-plans/route.ts`
- `POST`
- calls `generateCandidatePlansForAgent(data.deliveryDate)`

Service/orchestration:
`lib/agents/delivery/candidate-plans/generate-candidate-plans.ts`
- `generateCandidatePlansForAgent`
- calls `previewDeliveryOrdersForAgent`
- calls `getEnrichedDeliveryOrdersForRouting`
- calls `toPlanningStops`
- calls `buildAllStrategies`

Route Optimizer path:
`lib/agents/delivery/geocode/enrich-routing-stops.ts`
- `enrichRoutingStops`
- calls `geocodeAddressesBatch` only for uncached/un-coordinated stops

Route Optimizer client:
`lib/integrations/route-optimizer/client.ts`
- `geocodeAddressesBatch`

Endpoint:
- `POST /api/integrations/geocode-addresses`

Notes:
- This action does **not** call `optimize-preview`.
- It can still cause paid Google Geocoding usage through RO geocode enrichment.

### Preview Candidate Routes

UI:
`features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
- `handlePreviewCandidateRoutes`
- `POST /api/admin/delivery-agent/preview-candidate-plans`

API route:
`app/api/admin/delivery-agent/preview-candidate-plans/route.ts`
- `POST`
- calls `previewCandidatePlansForAgent(data.deliveryDate)`

Service/orchestration:
`lib/agents/delivery/candidate-plans/preview-candidate-plans.ts`
- `previewCandidatePlansForAgent`
- `previewCandidatePlansPipeline`
- if `baseCandidates` is absent, calls `generateCandidatePlansForAgent`
- calls `getEnrichedDeliveryOrdersForRouting`
- calls `expandFullCandidateVariants`
- loops `for (const variant of expansion.variants)`
- calls `previewCandidatePlan`
- calls `previewCandidateHandoff`
- calls `repairCandidateRoutePreview`
- calls `selectBestCandidatePlan`

Preview Route Optimizer client path:
`lib/agents/delivery/candidate-plans/preview-candidate-handoff.ts`
- `previewKitchenRun`
- `previewMarcoHandoffRunOnly`
- `previewHandoffRunChain`
- each calls `previewRouteOptimizerRun`

Repair Route Optimizer client path:
`lib/agents/delivery/candidate-plans/preview-candidate-route-repair.ts`
- `repairCandidateRoutePreview`
- may call:
  - `repreviewSkippedHandoffRuns`
  - `previewHandoffRunChain`
  - `previewMarcoHandoffRunOnly`
- these call `previewRouteOptimizerRun`

Route Optimizer client:
`lib/integrations/route-optimizer/client.ts`
- `previewRouteOptimizerRun`

Endpoint:
- `POST /api/integrations/runs/optimize-preview`

Geocode endpoint also possible:
- `POST /api/integrations/geocode-addresses`

### Generate Improved Candidate Plans

UI:
`features/admin-delivery-agent/delivery-agent-review-panel.tsx`
- `generateImprovedCandidatePlans`
- `POST /api/admin/delivery-agent/generate-improved-candidate-plans`

API route:
`app/api/admin/delivery-agent/generate-improved-candidate-plans/route.ts`
- `POST`
- calls `generateImprovedCandidatePlansForAgent`

Service/orchestration:
`lib/agents/delivery/candidate-plans/generate-improved-candidate-plans.ts`
- `generateImprovedCandidatePlansForAgent`
- loads existing `DeliveryAgentRun`
- interprets Donald feedback
- calls `generateCandidatePlansForAgent`
- applies feedback overrides
- calls `previewCandidatePlansPipeline({ baseCandidates, planningHints, deliveryAgentRunId })`
- calls `saveCandidateGeneration`

Route Optimizer client:
- Same as Preview Candidate Routes:
  - `geocodeAddressesBatch`
  - `previewRouteOptimizerRun`

Endpoints:
- `POST /api/integrations/geocode-addresses`
- `POST /api/integrations/runs/optimize-preview`

### Approve Plan

UI:
`features/admin-delivery-agent/delivery-agent-review-panel.tsx`
- `submitReview("approve")`
- `POST /api/admin/delivery-agent/review-plan`

API route:
`app/api/admin/delivery-agent/review-plan/route.ts`
- `POST`
- calls `submitDonaldPlanReview`

Service/orchestration:
`lib/agents/delivery/review-plan/submit-donald-plan-review.ts`
- `submitDonaldPlanReview`
- persists run log/review artifacts

Route Optimizer:
- No Route Optimizer call found.

Endpoint:
- None.

### Create Final Route Optimizer Runs

UI:
`features/admin-delivery-agent/delivery-agent-review-panel.tsx`
- `createFinalRouteRun`
- `POST /api/admin/delivery-agent/create-final-route-run`

API route:
`app/api/admin/delivery-agent/create-final-route-run/route.ts`
- `POST`
- calls `createFinalRouteRunFromApprovedPlan`

Service/orchestration:
`lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan.ts`
- `createFinalRouteRunFromApprovedPlan`
- loads approved `DeliveryAgentRun`
- reads `finalAcceptedPlan`
- builds final payloads with `buildFinalRouteCreatePayloads`
- filters already-successful external IDs
- calls `batchCreateFinalRoutesWithRetry`

Route Optimizer client:
`lib/integrations/route-optimizer/client.ts`
- `batchCreateAndOptimizeRouteOptimizerRuns`

Endpoint:
- `POST /api/integrations/runs/batch-create-and-optimize`

### Run Simple Route Preview

UI:
`features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
- `handleRoutePreview`
- `POST /api/admin/delivery-agent/preview-simple-route`

API route:
`app/api/admin/delivery-agent/preview-simple-route/route.ts`
- `POST`
- calls `previewSimpleRouteForAgent`

Service/orchestration:
`lib/agents/delivery/preview-simple-route.ts`
- `previewSimpleRouteForAgent`
- calls `previewDeliveryOrdersForAgent`
- calls `getEnrichedDeliveryOrdersForRouting`
- builds payload with `buildSimpleRoutePreviewPayload`
- calls `previewRouteOptimizerRun`

Route Optimizer client:
`lib/integrations/route-optimizer/client.ts`
- `geocodeAddressesBatch`
- `previewRouteOptimizerRun`

Endpoints:
- `POST /api/integrations/geocode-addresses`
- `POST /api/integrations/runs/optimize-preview`

### Verify Geocode Endpoint

API route:
`app/api/admin/delivery-agent/verify-geocode-endpoint/route.ts`
- `GET` and `POST`
- calls `verifyRouteOptimizerGeocodeEndpoint`

Service:
`lib/integrations/route-optimizer/verify-geocode-endpoint.ts`
- sends one sample address to `geocodeAddressesBatch`

Endpoint:
- `POST /api/integrations/geocode-addresses`

Notes:
- I did not find this wired to the visible Delivery Agent UI in inspected components, but the Admin route exists and can be called directly.

## 3. Route Optimizer Endpoints Called By Admin

Defined in:
`lib/integrations/route-optimizer/types.ts`

Client functions in:
`lib/integrations/route-optimizer/client.ts`

### `optimize-preview`

Endpoint:
- `/api/integrations/runs/optimize-preview`

Client:
- `previewRouteOptimizerRun`

Admin callers:
- `lib/agents/delivery/preview-simple-route.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-handoff.ts`
- indirectly through `lib/agents/delivery/candidate-plans/preview-candidate-route-repair.ts`
- indirectly through `lib/agents/delivery/candidate-plans/preview-candidate-plans.ts`
- indirectly through `lib/agents/delivery/candidate-plans/generate-improved-candidate-plans.ts`

### `create-and-optimize`

Endpoint:
- `/api/integrations/runs/create-and-optimize`

Client:
- `createAndOptimizeRouteOptimizerRun`

Admin callers:
- No production Admin caller found.
- Present in client tests only.

### `batch-create-and-optimize`

Endpoint:
- `/api/integrations/runs/batch-create-and-optimize`

Client:
- `batchCreateAndOptimizeRouteOptimizerRuns`

Admin callers:
- `lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan.ts`

### `geocode-addresses`

Endpoint:
- `/api/integrations/geocode-addresses`

Client:
- `geocodeAddressesBatch`

Admin callers:
- `lib/agents/delivery/geocode/enrich-routing-stops.ts`
- `lib/integrations/route-optimizer/verify-geocode-endpoint.ts`

### `runs/by-date`

Endpoint:
- `/api/integrations/runs/by-date`

Client:
- `fetchRouteOptimizerRunsByDate`

Admin callers:
- No production Admin UI/API caller found in this inspection.
- Learning code imports related RO historical types/parsers, but I did not find live Admin route-planning code calling this endpoint.

## 4. Cost Multiplier Analysis

### Generate Candidate Plans

Code:
- `generateCandidatePlansForAgent`
- `buildAllStrategies`

Candidate split count:
- Strategy definitions include 5 possible split strategies:
  - baseline two-run
  - DT-heavy North York
  - Marco-heavy North York
  - balanced North York
  - Self fallback light
- Self fallback is skipped if stops are below `MIN_STOPS_FOR_SELF_FALLBACK_CANDIDATE`.

RO calls:
- `optimize-preview`: 0
- `geocode-addresses`: up to 1 batch per click for all pending uncached addresses

Geocode multiplier:
- One user click can request geocode for up to all valid confirmed stops with no coordinates and no cache entry.
- Successful and failed cache entries are read first.
- Failed cache entries suppress new RO geocode until TTL expiry.
- Batch failures are not cached, so repeated clicks can repeat the full batch.

Repeated clicking:
- Frontend disables button while loading, but there is no server-side lock.
- Browser abort of previous request does not guarantee server-side work stops.

### Preview Candidate Routes

Code:
- `previewCandidatePlansPipeline`
- `expandFullCandidateVariants`
- `previewCandidatePlan`
- `previewCandidateHandoff`
- `repairCandidateRoutePreview`

Expansion caps from default profile:
- `maxSplitCandidatesToExpand`: 5
- `maxMeetupOptionsPerSplit`: 3
- `allowedMeetupFixedPositions`: [1, 2]
- `maxFullCandidateVariants`: 15

Variant multiplier:
- Raw combinations can be `5 splits x 3 meetup options x 2 fixed positions = 30`.
- Capped to 15 full candidate variants.

RO preview calls per variant:
- No handoff / kitchen-start previews: up to one call per non-empty run, typically 2 or 3.
- Handoff previews:
  - DT provider preview: 1 call
  - Marco receiver preview: 1 call if DT meetup ETA exists
  - Self backup preview: 1 call if present
  - Typical: 2 calls
  - With Self: 3 calls

Repair multiplier:
- If route-shape issues are detected and repair actions exist:
  - Marco-only repair: +1 preview call
  - DT handoff repair: can re-run DT, Marco, and Self: +2 to +3 calls
  - Skipped-handoff repair: can re-preview constrained affected runs, up to run count

Worst code-level estimate:
- 15 variants x up to 3 initial previews = 45 `optimize-preview` calls
- plus repair up to 15 variants x up to 3 re-previews = 45 additional calls
- total worst-case approx **90 `optimize-preview` calls per click**

Rate limiting:
- The loop stops after a candidate returns or throws a 429/rate-limit-looking error.
- This is reactive, not a pre-call budget.

Geocode:
- `previewCandidatePlansPipeline` also calls `getEnrichedDeliveryOrdersForRouting`.
- If `generateCandidatePlansForAgent` was called earlier, successful cache should reduce repeat geocode.
- If the geocode endpoint batch fails and is not cached, repeated preview clicks can keep calling geocode again.

### Generate Improved Candidate Plans

Code:
- `generateImprovedCandidatePlansForAgent`

Sequence:
- Loads run.
- Interprets feedback.
- Calls `generateCandidatePlansForAgent`.
- Applies overrides.
- Calls `previewCandidatePlansPipeline` with `baseCandidates`.

Cost:
- Same high preview fanout as Preview Candidate Routes.
- Also includes candidate generation geocode enrichment.
- Then preview pipeline performs enrichment again.

Repeated clicking:
- Frontend loading disable exists.
- No server-side duplicate-click lock found.
- Each successful click can create a new generation and re-run previews.

### Approve Plan

Code:
- `submitDonaldPlanReview`

Cost:
- 0 RO calls.
- Persists review/artifacts only.

### Create Final Route Optimizer Runs

Code:
- `createFinalRouteRunFromApprovedPlan`
- `batchCreateFinalRoutesWithRetry`

Batch size:
- One batch request contains one run payload per previewed non-empty final run.
- Usually 2 or 3 runs.

Retry multiplier:
- `FINAL_CREATE_RETRY_DELAYS_MS` has two delays.
- Loop allows attempts 0, 1, 2.
- On 429, up to **3 batch-create HTTP calls per click**.

Duplicate protection:
- If metadata says final run is already created and route IDs exist, returns idempotent replay.
- If partial creation exists, filters already-successful external IDs and sends missing runs only.
- Final payloads include:
  - `external_id`
  - `idempotency_key`
  - `planning_session_id`

Remaining risk:
- Reset final metadata can allow another create action.
- New final route generation suffixes can intentionally produce new external IDs/idempotency keys.

### Run Simple Route Preview

Code:
- `previewSimpleRouteForAgent`

Cost:
- Up to 1 geocode batch for uncached stops.
- Exactly 1 `optimize-preview` call.

Repeated clicking:
- Frontend loading disable exists.
- No server-side duplicate-click lock found.
- No preview cache found.

## 5. Missing Guardrails

Present:
- Candidate variant cap: yes, 15 variants.
- Candidate split expansion cap: yes, 5 splits.
- Meetup option cap: yes, 3 per split.
- Geocode cache before RO geocode: yes.
- Geocode idempotency key: yes.
- Final route idempotency key: yes.
- Final route external IDs: yes.
- Final route partial retry filtering: yes.
- Final route 429 retry limit: yes, 3 attempts total.
- Basic frontend loading disable: yes.
- Rate-limit stop for candidate preview loop: yes, reactive.
- Logging for geocode and final create: partial yes.

Missing or weak:
- No global **max RO calls per Admin action**.
- No server-enforced budget for candidate `optimize-preview` calls.
- No preview result cache for `optimize-preview`.
- No idempotency key on `optimize-preview` payloads.
- No duplicate-click server lock for preview actions.
- UI aborts previous requests, but server work may continue.
- No cost warning before candidate preview.
- No visible dry-run/mock mode for Admin planning.
- No single correlation ID carried through UI action, API route, geocode, preview calls, repair calls, and final create.
- No UI display of estimated RO calls before preview.
- No explicit max geocode addresses per action.
- No circuit breaker after spending a fixed number of preview calls.
- No confirmation dialog before high-fanout preview.

## 6. Highest-Risk Code Paths

1. `lib/agents/delivery/candidate-plans/preview-candidate-plans.ts`
   - `previewCandidatePlansPipeline`
   - Main variant fanout loop.

2. `lib/agents/delivery/candidate-plans/preview-candidate-handoff.ts`
   - `previewKitchenRun`
   - `previewMarcoHandoffRunOnly`
   - `previewHandoffRunChain`
   - Direct `optimize-preview` calls.

3. `lib/agents/delivery/candidate-plans/preview-candidate-route-repair.ts`
   - `repairCandidateRoutePreview`
   - Re-preview loop after route shape issues.

4. `lib/agents/delivery/candidate-plans/generate-improved-candidate-plans.ts`
   - `generateImprovedCandidatePlansForAgent`
   - Feedback-triggered re-entry into the same high-fanout preview pipeline.

5. `lib/agents/delivery/geocode/enrich-routing-stops.ts`
   - `enrichRoutingStops`
   - Batch geocode for uncached addresses.

6. `lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan.ts`
   - `batchCreateFinalRoutesWithRetry`
   - Final route batch create and retry behavior.

7. `features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
   - `handlePreviewCandidateRoutes`
   - `handleGenerateCandidatePlans`
   - `handleRoutePreview`

8. `features/admin-delivery-agent/delivery-agent-review-panel.tsx`
   - `generateImprovedCandidatePlans`
   - `createFinalRouteRun`

## 7. Whether Learning M20C Code Is Safe

M20C learning code appears safe from paid Google API usage in current production paths.

Findings:
- Learning modules mostly import RO historical response types/parsers, not paid preview/geocode/create clients.
- `fetchRouteOptimizerRunsByDate` exists, but no production Admin caller was found.
- Unit tests explicitly assert some learning modules do not import RO client/geocode/cache.
- Learning geo/outcome/resource modules are pure feature extraction over provided snapshots.

Important nuance:
- `runs/by-date` is still an RO endpoint. It may or may not be paid depending on RO implementation, but it is not Google Directions/Route Optimization/Geocoding creation/preview traffic from Admin route planning.

Verdict:
- **M20C learning code does not appear to call paid Google APIs.**

## 8. Recommended P0 Guardrails

1. Add server-side RO call budget per action.
   - Example: max 10 preview calls for normal candidate preview unless explicitly overridden.

2. Add candidate preview result cache.
   - Key by delivery date, profile version, candidate id, stop hash, handoff variant, and repair constraints.

3. Add idempotency/correlation ID for preview calls.
   - Include in Admin request, RO preview payload, logs, and response.

4. Add duplicate-click server lock.
   - Lock by `{action, deliveryDate, profileId, actor}` for preview and improved generation.

5. Add cost warning before candidate preview.
   - Show estimated variants, runs, repair allowance, and max RO calls.

6. Lower production preview cap.
   - Keep full 15-variant mode behind an explicit advanced confirmation.

7. Add dry-run/mock mode for Admin testing.
   - Make it impossible to accidentally call paid RO in test/demo sessions.

8. Add per-action circuit breaker.
   - Stop after N `optimize-preview` calls regardless of variant count.

9. Add geocode max and reuse policy.
   - Cap addresses per geocode call and require cache reuse before retrying failed batches.

10. Add stronger final route create confirmation.
    - Show run count, existing metadata, generation suffix, and idempotency keys before sending.

## 9. Files To Inspect/Fix In Next Implementation Milestone

- `features/admin-delivery-agent/admin-delivery-agent-tab.tsx`
- `features/admin-delivery-agent/delivery-agent-review-panel.tsx`
- `app/api/admin/delivery-agent/preview-candidate-plans/route.ts`
- `app/api/admin/delivery-agent/generate-improved-candidate-plans/route.ts`
- `app/api/admin/delivery-agent/preview-simple-route/route.ts`
- `app/api/admin/delivery-agent/create-final-route-run/route.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-plans.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-handoff.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-route-repair.ts`
- `lib/agents/delivery/candidate-plans/expand-full-candidate-variants.ts`
- `lib/agents/delivery/candidate-plans/generate-improved-candidate-plans.ts`
- `lib/agents/delivery/geocode/enrich-routing-stops.ts`
- `lib/agents/delivery/geocode/geocode-cache.ts`
- `lib/agents/delivery/final-route-run/create-final-route-run-from-approved-plan.ts`
- `lib/integrations/route-optimizer/client.ts`
- `lib/integrations/route-optimizer/types.ts`

## 10. Confirmation No Files Were Modified During Inspection

During the original inspection pass, no files were modified.

This Markdown report file was created afterward at the user's explicit request:

- `docs/cost-0a-delivery-agent-google-api-cost-spike-inspection.md`


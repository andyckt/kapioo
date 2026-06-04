# Kapioo Delivery Agent — Master Context

Last updated: 2026-06-03

This document is the standing context for future Delivery Agent, Kapioo Admin, Route Optimizer, historical learning, LLM planning, and Google API cost-guardrail work.

Future Codex/Cursor agents should read this file before making changes to Delivery Agent logic.

---

## 1. What Kapioo is

Kapioo is a Toronto-based meal delivery / meal plan business.

Kapioo prepares fresh meals from a central kitchen and delivers meals to customers in the GTA.

Important operating details:
- Central kitchen is in East York / Toronto area.
- Daily delivery service is time-sensitive.
- Daily delivery target window is roughly late morning to 1 PM.
- The hard deadline for the Delivery Agent is 1 PM.
- No customer order should be delivered after 1 PM.
- Current delivery areas include Toronto downtown, midtown, North York, Richmond Hill, Markham, Thornhill, and nearby areas depending on product line.
- Kapioo has office-worker and daily lunch demand.
- Kapioo wants stable, scalable delivery operations.

Kapioo uses software to manage:
- customer orders
- daily menus
- admin operations
- delivery planning
- route optimization
- customer communications
- historical delivery learning
- future AI-assisted planning

The Delivery Agent is one part of Kapioo’s broader website/admin operations system. It is an admin-support feature for daily delivery planning, not the identity or whole purpose of the repo.

---

## 2. What the Kapioo repo is

The Kapioo repo is the website/admin system for the Kapioo meal plan business.

It includes the broader product and operations system for:
- customer-facing website behavior
- meal plan business operations
- customer/order management
- daily menus and meal plan workflows
- admin workflows for Donald/team
- communications and operational tooling
- delivery planning support

The Delivery AI Agent is only one admin feature inside this broader Kapioo system. Its purpose is to ease the daily admin task of arranging delivery plans.

For Delivery Agent work, this repo contains:
- Admin UI used by Donald/team
- customer/order management
- daily delivery order data
- admin delivery planning interface
- Delivery Agent planning UI
- candidate plan generation logic
- candidate route preview orchestration
- Donald review/approval flow
- final route creation trigger
- historical learning modules
- DeliveryAgentRun live planning records
- DeliveryAgentLearningCase historical memory records
- integration clients to call the separate Route Optimizer system

For Delivery Agent scope, the Kapioo repo should be treated as:
- the admin/business context layer
- the Delivery Agent orchestration layer
- the Delivery Agent brain/planning layer
- the place where Delivery Agent historical learning memory is stored and used

Do not treat the entire Kapioo repo as only a Delivery Agent repo. Delivery Agent changes should remain scoped to relevant admin, delivery planning, historical learning, and Route Optimizer integration areas.

The Kapioo repo generally should not directly call Google Maps APIs for routing proof. Instead, Delivery Agent routing proof usually goes through the Route Optimizer integration endpoints.

Important Admin-side Delivery Agent actions:
- Generate Candidate Plans
- Preview Candidate Routes
- Generate Improved Candidate Plans
- Approve Plan
- Create Final Route Optimizer Runs
- Simple Route Preview
- Historical learning/backfill later

---

## 3. What the Route Optimizer repo is

The Route Optimizer repo is a separate routing execution system.

It contains:
- route calculation engine
- Route Optimizer integration endpoints
- Google Maps API calls
- saved DeliveryRun records
- optimized route sequences
- driver route/start/complete flows
- geocoding helpers
- Directions API client
- Route Optimization API client
- Geocoding API client

The Route Optimizer repo should be treated as:
- the routing calculation/proof engine
- the system that stores actual optimized driver runs
- the system drivers interact with for route execution
- the system that calls paid Google APIs

Important Route Optimizer integration endpoints:
- POST /api/integrations/runs/optimize-preview
- POST /api/integrations/runs/create-and-optimize
- POST /api/integrations/runs/batch-create-and-optimize
- POST /api/integrations/geocode-addresses
- GET /api/integrations/runs/by-date

Route Optimizer should not be treated as a free search engine. It can call expensive paid Google APIs.

---

## 4. Kapioo Admin repo ↔ Route Optimizer repo relationship

The Delivery Agent system is split across two repos:

Kapioo Admin repo:
- decides candidate delivery plans
- holds business logic
- manages Donald review/approval
- stores historical learning cases
- calls Route Optimizer for previews/final runs

Route Optimizer repo:
- calculates actual routes
- calls Google Maps APIs
- stores driver runs
- provides route proof/result back to Admin

Normal planning flow:

1. Donald uses the Kapioo Admin Delivery Agent UI.
2. Admin gathers today’s orders.
3. Admin generates and validates candidate plans.
4. Admin calls Route Optimizer optimize-preview only for finalist candidate runs.
5. Route Optimizer calls Google APIs to calculate route proof.
6. Route Optimizer returns route ETA/distance/sequence.
7. Admin ranks/recommends a plan.
8. Donald approves.
9. Admin calls Route Optimizer batch-create-and-optimize to create final driver runs.

Historical learning flow:

1. Admin fetches historical Admin orders.
2. Admin calls Route Optimizer runs/by-date endpoint.
3. Admin matches Admin orders to RO stops.
4. Admin builds DeliveryAgentLearningCase records.
5. Historical learning should not call expensive preview/create Google APIs.
6. Historical learning should use existing Route Optimizer historical data, not create new paid optimizations.

Cost-risk boundary:

Admin candidate preview fanout
→ Route Optimizer optimize-preview
→ Google paid APIs

Admin can multiply calls by generating many candidate variants.
Route Optimizer can multiply cost because one optimize-preview request may bill by:
- flexible shipment/customer stop count
- Directions leg count
- missing geocode count

Therefore both repos need guardrails.

Admin-side guardrails should limit:
- number of candidate variants previewed
- number of optimize-preview calls per action
- duplicate clicks
- repair/re-preview loops
- estimated cost shown to Donald

Route Optimizer-side guardrails should limit:
- expensive preview requests
- shipment count per request
- Directions leg count
- geocode count
- daily/per-token quota
- missing lat/lng previews
- repeated identical previews

Division of responsibility:

Kapioo Admin should:
- decide what plans are worth previewing
- keep candidate count small
- send lat/lng whenever possible
- provide correlationId/idempotency key
- show estimated cost/risk
- avoid using RO as a search engine

Route Optimizer should:
- estimate paid units before Google calls
- reject requests that exceed budgets
- cache geocode/preview results where appropriate
- enforce server-side quotas
- log correlationId and estimated/actual paid units
- never trust Admin as the only cost guardrail

Important design principle:

Do not use Route Optimizer as the search engine.

Use:
- LLM
- historical learning
- local geo/spread calculations
- deterministic validation
- cheap scoring

to narrow candidates first.

Use Route Optimizer only as final proof for the top 1–3 serious candidate plans.

---

## 5. Delivery Agent project overview

Kapioo is building an AI Delivery Agent for daily meal delivery planning.

The final product should help Donald generate the best daily delivery plan by using:
- today’s confirmed orders
- historical delivery cases
- geographic spread and clusters
- driver/run resource profile
- Donald’s operational preferences
- LLM reasoning
- deterministic validation
- Route Optimizer preview/proof
- Donald approval before final route creation

The agent should recommend a practical route split for daily delivery, including:
- which order IDs go into which run
- whether handoff/meetup is needed
- where handoff should happen
- which stops should be fixed
- whether an end stop should be used
- whether support/Donald/self is needed
- whether all orders can finish before 1 PM

The goal is not just to produce routes. The goal is to produce routes that match real Kapioo operations and are safe, affordable, and trustworthy.

---

## 6. Core Delivery Agent business rules

### 6.1 Hard delivery deadline

No order should be delivered after 1 PM.

The 1 PM deadline is a hard rule. It is above all other scoring preferences.

A late 2-driver plan should never beat an on-time support/self plan.

If all candidates are late, the system should not pretend one is recommended. It should show infeasible/risky status and ask for support/manual help.

### 6.2 Current driver/resource logic

Current setup:
- Use the current hired drivers/runs first.
- Donald/self is rare final backup.
- Support run is only allowed if current hired drivers cannot meet the 1 PM deadline.

Future setup:
- If Kapioo hires 3 drivers, the agent should use 3 hired drivers first.
- Donald/self should still be last resort.
- Old 2-driver history can still be used for geography/cluster lessons, but should not be blindly copied as exact 2-driver splits.

### 6.3 Support/self rule

Donald/self should be the last backup with the fewest possible orders.

Support/self should not be used just to improve score or finish slightly earlier if a safe hired-driver plan can meet 1 PM.

### 6.4 Preferred optimization priority

Donald’s preferred operational split pattern matters first, as long as the plan can meet the 1 PM deadline.

Then optimize finish time, buffer, and route smoothness.

### 6.5 Handoff/meetup rules

Meet-up points should be operationally reasonable.

Avoid meetups:
- too close to the kitchen
- too far from the receiver driver’s homebase/direction
- too far north
- too far west
- too inconvenient for the receiving driver

North York is the key flexible middle zone.

Provider driver should often deliver on-the-way stops before handoff if not doing so creates backtracking or delays.

Same-building clusters, downtown, midtown, Markham, and Richmond Hill should stay together when possible.

---

## 7. Planning profile explained

A planning profile means the current delivery setup/rules.

Simple definition:

Profile = driver/run setup + backup policy + deadline rules + operational preferences for this delivery mode.

Examples:

Current profile:
- 2 hired drivers
- Donald/self as rare backup
- 1 PM hard deadline
- use 2 hired drivers first
- use Donald/self only if 2-driver plan cannot meet 1 PM

Future profile:
- 3 hired drivers
- Donald/self as rare backup
- 1 PM hard deadline
- use 3 hired drivers first
- use Donald/self only if 3-driver plan cannot meet 1 PM

Why profile matters:
A good 2-driver split may not be the best 3-driver split. Historical cases must store resource profile features so future retrieval and LLM planning know whether an old case is directly comparable or only transferable.

---

## 8. Profile transfer logic

Historical data may be mostly from 2-driver + Donald backup days.

If Kapioo hires a third driver, the AI Agent should not become useless. It should use old history correctly.

Old 2-driver history is useful for:
- which areas naturally stay together
- far-west/far-north outliers
- Markham/Richmond Hill grouping
- downtown/midtown grouping
- North York as middle zone
- handoff quality
- bad meetup locations
- route shape and backtracking lessons
- fixed/end stop usage
- deadline risks

Old 2-driver history should not be blindly copied for:
- exact run count
- exact driver names
- exact 2-run split size
- exact support/self usage
- old handoff requirement if 3 drivers make handoff unnecessary

Future retrieval should include profile compatibility:
- same_profile: directly comparable
- transferable_profile: useful for geography/route lessons but not exact run count
- different_profile: low relevance
- unknown: use cautiously

---

## 9. Historical learning architecture

The long-term memory model is:

DeliveryAgentLearningCase

One DeliveryAgentLearningCase = one frozen historical delivery day for one planning profile.

DeliveryAgentRun = live planning session.
DeliveryAgentLearningCase = historical long-term memory.

Do not stuff long-term historical learning into DeliveryAgentRun.

Learning cases should store:
- Admin historical order snapshots
- Route Optimizer historical runs snapshots
- order ↔ RO stop matching results
- coordinate snapshots
- geo/spread features
- route-shape features
- fixed/end/handoff stop-control features
- outcome features
- resource profile features
- profile transfer metadata
- learning label / quality summary
- warnings / review status
- schema version

---

## 10. Historical learning milestone status

Completed historical learning milestones:

### M20A — Customer identity matching SSOT

Added customer identity helper module:
lib/agents/delivery/customer-identity/

Purpose:
Match Kapioo Admin historical orders to RO stops.

Matching priority:
1. exact order ID
2. derived RO-style customer name, for example:
   Kapioo name: Donald
   Kapioo phone: 4379891111
   RO customer name: Donald-1111

Conservative behavior:
- no name-only high confidence matching without phone last4
- no fuzzy matching as auto-accept
- exact order ID wins even if names differ

### M20A.1 — Final route identity/idempotency SSOT

Centralized final route external_id/idempotency logic.

Important:
Generation suffixes such as :v2 must remain aligned between payload and validation/error paths.

### M20B — Route Optimizer runs-by-date endpoint

Route Optimizer repo added:

GET /api/integrations/runs/by-date?date=YYYY-MM-DD

Purpose:
Return historical RO runs for one run_date.

### M20C-1 — Admin RO by-date client

Admin repo added:
fetchRouteOptimizerRunsByDate()

Purpose:
Typed read-only client for RO historical runs by date.

No learning cases/backfill in this milestone.

### M20C-2 — DeliveryAgentLearningCase model/contracts

Admin repo added:
- lib/contracts/delivery-agent-learning.ts
- models/DeliveryAgentLearningCase.ts
- learning contracts/enums/interfaces
- schema version
- learning labels
- coordinate sources
- run roles
- resource profile fields
- profile transfer fields
- review status
- indexes

Important:
geoFeatures, routeShapeFeatures, stopControlFeatures, outcomeFeatures, resourceProfileFeatures may be stored as Mixed in Mongoose but should follow TypeScript contracts in code.

### M20C-3A — Historical Admin order snapshot fetch + mapper

Added:
- HISTORICAL_LEARNING_ORDER_STATUSES = ["confirmed", "delivered"]
- getHistoricalOrdersForLearning()
- mapOrderToLearningOrderSnapshot()

Important:
Historical learning uses confirmed + delivered.
Live planning defaults remain separate and unchanged.

### M20C-3A.1 — Test cleanup

Fixed test-only TypeScript issue with ?raw imports. No production logic change.

### M20C-3B — Historical Admin order ↔ RO stop matching

Added pure matching layer:
matchOrdersToRouteOptimizerRunsForDate()

Input:
- DeliveryAgentLearningOrderSnapshot[]
- RouteOptimizerRunsByDateResponse

Output:
- matchedStops
- unmatchedOrders
- unmatchedRoStops
- matchCoverage
- warnings

Matching priority:
1. exact order ID
2. derived Donald-1111 RO name
3. no fuzzy fallback

Synthetic handoff stops are preserved and not treated as customer matching errors.

### M20C-3C — Coordinate snapshots + geo/spread features

Added pure coordinate and geo feature layer.

Outputs:
- coordinateSnapshots
- coordinateCoverage
- geoFeatures

Includes:
- finite coordinate checks
- RO historical coordinate priority
- Admin order coordinate fallback
- address-only fallback
- bounding box
- center point
- north/south spread
- east/west spread
- max distance from center
- dynamic outliers
- area distribution
- same-building clusters

Important:
Geographic spread is first-class. Do not treat it as optional.

### M20C-3D — Route-shape / stop-control / outcome / resource-profile extractors

Added operational feature extractors.

Includes:
- routeShapeFeatures
- stopControlFeatures
- outcomeFeatures
- resourceProfileFeatures
- driver-start-delay normalization
- lateness attribution
- handoff delay inference

Important edge case:
A route may finish after 1 PM because provider driver started late, not because route design was bad.

Store and calculate:
- plannedStartTimes
- actualStartTimes
- startDelayMinutesByRun
- providerStartDelayMinutes
- actual finish
- actualLateMinutes
- normalizedFinishTimeIfStartedOnTime
- normalizedDeadlineBufferMinutes
- routeWouldHaveMetDeadlineIfStartedOnTime
- latenessAttribution
- handoffDelayLikely
- receiverLikelyDelayedByProvider

Lateness attribution values:
- on_time
- route_problem
- driver_start_delay
- handoff_delay
- mixed
- unknown

Use:
- late because route bad = negative/avoid pattern later
- late because driver started late but normalized on-time = weak positive route pattern
- mixed = use cautiously

---

## 11. Remaining historical learning roadmap

Do not continue heavy route preview testing until cost guardrails are in place.

Future M20C work after cost guardrails:

### M20C-3E — One-date LearningCase builder + save/upsert

Should combine:
- getHistoricalOrdersForLearning()
- fetchRouteOptimizerRunsByDate()
- matchOrdersToRouteOptimizerRunsForDate()
- buildLearningCoordinateSnapshots()
- computeDeliveryGeoFeatures()
- extract route shape
- extract stop controls
- extract outcome features
- extract resource profile features
- classify preliminary quality
- save/upsert DeliveryAgentLearningCase

### M20C-4 — Backfill + review

Backfill recent 30–60 delivery days.

Add simple uncertain match review:
- Accept
- Edit
- Ignore

Uncertain matches should be easy for Donald to review.

---

## 12. Future AI planning architecture

Original risky logic:
Generate many candidate variants → preview many through RO → repair/repreview → pick best.

New cost-safe logic:
Think cheap first. Preview expensive only at the end.

Final future flow:
1. Coordinate preparation
2. Today fingerprint
3. Historical similarity retrieval
4. LLM drafts actual candidate splits
5. Local cheap validation/scoring
6. RO preview only top 1–3 candidates
7. Strict retry budget
8. Recommend only qualified plan
9. Donald approves
10. Create final RO runs with idempotency

Do not use Route Optimizer as the search engine.
Use LLM + history + local geo logic as the search engine.
Use Route Optimizer only as final proof.

---

## 13. Candidate generation principle

Future LLM should output complete candidate plans, not vague strategy templates.

Bad:
“Try downtown-heavy plan with possible meetup options.”

Good:
Candidate A:
- Run A exact order IDs
- Run B exact order IDs
- handoff location/source
- before-handoff stops
- fixed stop choices
- end stop choices
- support/self usage
- explanation

Candidate limit:
- LLM may think internally about more ideas
- but should output max 3 complete candidate plans
- local scoring should narrow further
- RO should preview only top finalists

---

## 14. Local cheap scoring before RO

Before any paid RO preview, the system should use cheap local checks:
- every order assigned once
- no duplicate order IDs
- coordinate coverage
- area distribution
- cluster grouping
- far-west/far-north outlier handling
- same-building grouping
- handoff reasonableness
- support/self last-resort rule
- deadline risk estimate
- profile compatibility
- historical similar case reasoning

These checks use:
- stored lat/lng
- geoFeatures
- historical learning cases
- pure distance calculations
- operational rules

No Google paid calls should happen in this stage.

---

## 15. Google API cost incident summary

A major Google API cost spike happened on May 30/31.

Billing showed approximately:
- Directions API: 13,533 billable count, about $116.62
- Route Optimization API / SingleVehicleRouting: 12,015 billable count, about $95.88
- Geocoding API: 11,570 billable count, about $10.73
- Gemini API: about $1.34

Total with tax was about $253.78.

This was not caused by LLM.
The cost came from Google Maps routing/geocoding APIs.

Donald normally does not pay this level for manual RO use.

---

## 16. COST-0A Admin inspection summary

COST-0A inspected the Admin repo.

Highest-risk Admin actions:
1. Preview Candidate Routes
2. Generate Improved Candidate Plans
3. Run Simple Route Preview, lower fanout
4. Create Final Route Optimizer Runs, final create path

Main Admin-side multiplier:
Preview Candidate Routes can:
- expand up to 15 full candidate variants
- each variant can call RO optimize-preview 2–3 times
- repair/re-preview can add 1–3 more calls
- worst code-level estimate around 90 RO optimize-preview calls per heavy click

Generate Improved Candidate Plans reuses the same preview pipeline and has the same risk.

Generate Candidate Plans alone does not call optimize-preview, but can call geocode enrichment.

Missing/weak Admin guardrails:
- no global max RO calls per Admin action
- no server-enforced preview budget
- no preview result cache
- no idempotency key for optimize-preview
- no server duplicate-click lock
- UI abort does not guarantee server cancellation
- no dry-run/mock mode
- no cost warning before preview
- no full correlation ID through UI → Admin → RO → Google
- no per-action circuit breaker
- no clear estimated cost display

M20C learning code appears safe from paid Google API usage.

---

## 17. COST-0B Route Optimizer inspection summary

COST-0B inspected the Route Optimizer repo.

Highest-risk RO endpoint:
POST /api/integrations/runs/optimize-preview

One optimize-preview request can call:
- Google Geocoding API once per customer missing lat/lng + geocode_status success
- Google Geocoding API for start location
- Google Geocoding API sometimes for end location
- Google Route Optimization API once per run if flexible stops exist
- Google Directions API once per stop/leg, plus optional return leg

Route Optimization billing:
- Google bills SingleVehicleRouting per shipment/flexible stop, not per HTTP request.
- RO sends one vehicle and one shipment per flexible customer stop.
- 855 Route Optimization API requests becoming 12,015 billable units implies about 14.05 shipments per request.
- Directions count 13,533 implies about 15.83 Directions calls per request, consistent with per-stop Directions calls.
- Geocoding count 11,570 is consistent with repeated geocoding during previews and start/end geocoding.

Full cost equation:
Admin preview fanout × RO per-stop/per-shipment billing = 10k+ Google billable units.

Roughly 9–10 heavy Admin preview/improve clicks could generate the observed cost spike.

Missing/weak RO guardrails:
- no optimize-preview idempotency
- no preview result cache
- no route result cache
- no geocode cache
- no durable per-token quota
- no daily cap/circuit breaker
- in-memory per-IP rate limits only
- no dry-run/mock mode
- no required correlation ID
- no estimated billable unit logging
- start geocode every optimize request
- possible duplicate end geocode
- batch-create can optimize multiple runs independently

---

## 18. Updated cost-safe architecture

The AI Agent must be redesigned so cost is bounded.

New principle:
Do not use Route Optimizer as the search engine.
Use Route Optimizer only as the final proof engine.

Target normal daily planning:
- 2–6 RO optimize-preview calls total
- hard cap on paid previews
- rescue mode maybe 8–10 calls with explicit confirmation

Old dangerous behavior:
- up to around 90 RO optimize-preview calls per heavy click
- each RO preview bills per stop/shipment and per Directions leg

New behavior:
- LLM/history/local logic generates candidate plans cheaply
- local scoring filters candidates
- only top 1–3 are previewed
- stop when preview budget is reached
- no open-ended repair/repreview loops

---

## 19. Immediate priority before continuing M20C-3E

Do not continue with heavy Delivery Agent route preview testing before cost guardrails.

Next work should be COST-1 emergency guardrails.

Recommended sequence:

### COST-1A — Admin-side hard preview budget and cost warning

Purpose:
Stop Admin from sending 90 RO preview calls per click.

Possible features:
- max candidate variants previewed per action
- max optimize-preview calls per action
- max repair re-preview calls
- server-side circuit breaker inside previewCandidatePlansPipeline
- return warning when preview budget is exhausted
- UI shows estimated preview count/cost-risk before preview
- no full 15-variant mode unless explicitly advanced/confirmed

### COST-1B — RO-side hard paid-call budget/circuit breaker

Purpose:
Even if Admin bugs, RO should reject expensive preview requests.

Possible features:
- estimate shipments, Directions legs, geocode calls before paid calls
- reject high-cost preview without explicit override
- require correlationId
- log estimated billable units
- per-integration-token daily preview quota
- durable cap/circuit breaker later

### COST-1C — Correlation ID and logging

Purpose:
Future cost spikes can be traced exactly.

Need:
- UI action ID
- Admin API route logs
- Admin RO client logs
- RO endpoint logs
- Google-call estimate logs
- candidateId/runId/deliveryDate/profileId
- no secret leakage

### COST-1D — Preview cache/idempotency

Purpose:
Do not pay twice for same candidate preview.

Need:
- normalized preview payload hash
- short TTL cache
- idempotency key for optimize-preview
- reuse result if same candidate is previewed again

### COST-1E — Geocode/start/end cache improvements

Purpose:
Stop repeated geocoding.

Need:
- cache normalized customer address
- cache start/kitchen geocode
- cache end location geocode
- avoid duplicate end geocode
- cache failed/zero-result with TTL

---

## 20. Google Cloud non-code safeguards

Donald should also set Google Cloud budget/quotas.

Recommended immediate Google Cloud controls:
- budget alert
- Route Optimization API quota cap
- Directions API quota cap
- Geocoding API quota cap
- separate staging/testing Google project/key if possible
- disable unrestricted testing with production Google key

Code guardrails are required, but Cloud quotas protect against unexpected bugs.

---

## 21. SSOT and architecture rules

Apply SSOT wherever appropriate.

Avoid:
- duplicated constants
- duplicated endpoint paths
- duplicated business rules
- duplicated status enums
- duplicated payload shapes
- duplicated validation logic
- duplicated idempotency logic
- duplicated geocode/cost-budget logic

Prefer:
- shared contracts
- centralized route optimizer paths
- typed schemas
- pure feature extractors
- reusable helpers
- server-side guardrails
- focused tests

---

## 22. Development methodology Donald wants

Donald wants agent-native development and verification.

Rules:
- Avoid vague mega-prompts.
- Use interview/inspection loops before coding when requirements are uncertain.
- Prefer stronger reasoning models for architecture-impacting backend/database/idempotency/cost-safety work.
- Use HTML specs/docs for complex planning when useful.
- Add tests and evidence after each milestone.
- Use DOM/data verification contracts when building UI later.
- Keep implementation milestones small and controlled.
- Proactively identify missing variables and edge cases before coding.
- Always think about final project architecture, not just isolated patch tasks.

---

## 23. Tool workflow

Recommended collaboration model:
- Donald = final business decision maker
- ChatGPT = architecture planner, prompt writer, reviewer, business logic reasoning
- Codex/GPT-5.5 = repo inspector and controlled executor
- Cursor/Composer 2.5 = small low-risk patches/UI cleanup when useful

Codex should not “freestyle” or take over the whole project.

Every Codex task should:
- read this master context first
- read relevant inspection docs
- have one narrow milestone
- state forbidden changes
- run focused tests
- report exact changes
- avoid unrelated refactors

---

## 24. Current safety warning

Do not repeatedly click:
- Preview Candidate Routes
- Generate Improved Candidate Plans
- Create Final Route Optimizer Runs

until COST-1 guardrails exist.

The next priority is cost safety, not more AI learning pipeline work.

---

## 25. Important docs to read before future work

Future Codex tasks should read:
- docs/delivery-agent-master-context.md
- docs/cost-0a-delivery-agent-google-api-cost-spike-inspection.md if present
- docs/cost-0b-route-optimizer-google-api-cost-spike-inspection.md if present
- docs/delivery-agent-m19d-architecture-guardrail-ssot-inspection.md if present
- docs/delivery-agent-m19c-historical-learning-architecture.md if present
- docs/delivery-agent-planning-profile.md if present

If a doc is missing, ask Donald rather than guessing.

---

## 26. Immediate next task after this context doc

After this document is created, the next recommended task is not M20C-3E.

The next recommended task is:

COST-1 planning and then COST-1A implementation.

COST-1 should prevent another Google API cost spike by adding hard server-side cost budgets, preview caps, correlation IDs, warnings, and later caches/quotas.

Do not implement COST-1 in this context-doc task.

---

End of document.

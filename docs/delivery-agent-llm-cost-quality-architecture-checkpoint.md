# LLM-COST-0 / M21A - Delivery Agent LLM Cost and Quality Architecture Checkpoint

Created: 2026-06-05

Scope: planning checkpoint only. This report inspects the current Kapioo Admin repo direction and defines the LLM cost, quality, cache, model-routing, retry, and evaluation architecture that should exist before M21/M22 proceeds further.

Forbidden work honored in this checkpoint:
- No production app code was implemented.
- No LLM provider was wired.
- No models, APIs, UI, tests, or business logic were modified.
- No Route Optimizer repo changes were made.
- No paid LLM, Google, Route Optimizer, or external API call was made.
- No commit was created.

Files/docs inspected:
- `docs/delivery-agent-master-context.md`
- `docs/delivery-agent-cost-safe-high-performance-system-design.html`
- `docs/delivery-agent-cost-safe-design-plain-english.html`
- `docs/cost-0a-delivery-agent-google-api-cost-spike-inspection.md`
- `docs/delivery-agent-m20c0-historical-learning-architecture-inspection.md`
- `docs/delivery-agent-lat-lng-enrichment-design.md`
- current Delivery Agent candidate generation, preview budget, preview cache, learning case, feedback, planning profile, and Route Optimizer integration code

## 1. Executive summary

Donald's concerns are valid. The current direction is good, but it is not complete enough to wire in LLM planning yet.

The repo already has a strong foundation for avoiding the previous Google API cost spike:
- Admin preview budgets now cap candidate preview fanout.
- Candidate preview cache avoids paying again for the same recent preview.
- Correlation IDs and idempotency keys are present in the Admin preview path.
- Route Optimizer cost estimates are carried back into Admin preview budget summaries.
- Historical learning cases now store route shape, stop controls, outcome, resource profile, geo features, and quality labels.

But the LLM layer is not built yet. That is good news because we can still design it correctly before it becomes expensive or hard to change.

Current go/no-go:
- Go for a small LLM-COST architecture/config milestone next.
- Go for local M21 similarity retrieval if it uses existing historical data and no paid APIs.
- No-go for M22 LLM candidate generation until LLM cost policy, prompt contract, model routing, cache/fingerprint, and evaluation gates are implemented.

The main design answer:
- Do not rely on a cheap model for every day.
- Do not rely on the strongest model for every day.
- Use deterministic/local logic for easy days.
- Use a strong model when the day is operationally complex.
- Use the strongest/rescue model only when the system cannot find a qualified plan and Donald confirms the extra spend.
- Cache results when the order set, profile, rules, prompt, model, feedback, and learning corpus have not changed.
- Evaluate models on historical days before trusting cheaper routing decisions in production.

This should let the agent stay cost-efficient without making it weak.

## 2. Current repo implementation status

### Already present

Route Optimizer preview safety in Admin:
- `lib/agents/delivery/candidate-plans/preview-budget.ts`
- `lib/agents/delivery/candidate-plans/preview-cache.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-plans.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-handoff.ts`
- `lib/agents/delivery/candidate-plans/preview-candidate-route-repair.ts`

Current deterministic candidate generation:
- `lib/agents/delivery/candidate-plans/generate-candidate-plans.ts`
- Generates fixed strategy templates such as baseline, DT-heavy, Marco-heavy, balanced North York, and light self fallback.
- This does not call an LLM.

Improvement after Donald feedback:
- `lib/agents/delivery/candidate-plans/generate-improved-candidate-plans.ts`
- `lib/agents/delivery/feedback/interpret-donald-feedback.ts`
- Feedback interpretation is deterministic text parsing, not LLM-based.

Historical learning case foundation:
- `models/DeliveryAgentLearningCase.ts`
- `lib/contracts/delivery-agent-learning.ts`
- `lib/agents/delivery/learning/*`
- Stores historical order snapshots, RO run snapshots, matched stops, geo features, stop controls, route shape, outcome, resource profile, quality labels, and review status.

Planning profile:
- `lib/agents/delivery/planning-profile/default-profile.ts`
- Current profile knows the 1 PM deadline, preferred 10-minute buffer, current Run A/Run B/self setup, handoff behavior, meetup preferences, self fallback rules, and scoring weights.

Route Optimizer integration:
- `lib/integrations/route-optimizer/client.ts`
- `lib/integrations/route-optimizer/types.ts`
- Admin can call RO preview, geocode, final create, batch create, and by-date historical endpoints.

### Not present yet

I did not find delivery-agent code wired to:
- OpenAI
- Gemini
- Anthropic
- LangChain
- Vercel AI SDK
- embeddings
- prompt templates
- model routing
- token usage tracking
- LLM cost ledger
- LLM result cache
- LLM planning fingerprint

This means the next architecture decision is still open. That is the right time to set guardrails.

## 3. Final LLM call map

The system should treat every LLM call as a named, budgeted operation. No hidden "just ask the model again" loop should exist.

Token ranges below are planning estimates, not price promises. Actual prices must come from a versioned pricing config for the selected provider/model.

| LLM call | Purpose | Trigger | Required? | Normal frequency | Max attempts | Input data | Output data | Token range estimate | Cache/persist | Cheaper replacement |
|---|---|---|---|---:|---:|---|---|---|---|---|
| Daily candidate-plan generation | Produce complete candidate plans with exact order IDs, run slots, handoff/fixed/end/self decisions | Deterministic/local system says today is not an easy no-LLM day, or Donald asks for AI planning | Required only for complex days and M22+ AI planning | 0-1 per day | 1 normal call | compact today facts, compact profile, local candidate seeds, 1-3 detailed historical cases, compact lessons, hard rules, budget view | max 3 complete candidate plans in strict JSON | 5k-18k input normal, 18k-35k complex, 1.5k-5k output | cache by planning fingerprint; persist on DeliveryAgentRun | deterministic templates plus local scoring on easy days |
| Candidate critique/improvement | Find weaknesses in generated candidates and improve only if local validation/score says quality is insufficient | Main generation returns valid but weak/diversity-poor/risky candidates | Optional | 0-1 | 1 | generated candidates, local validation failures, score breakdown, historical conflict notes | revised candidates or "no safe improvement" | 4k-12k input, 500-2k output | cache by candidate set plus validation fingerprint | local validation/repair, deterministic finalist selection |
| Rescue/support planner | Decide minimal self/support plan when no 2-driver plan is qualified or RO proof fails | No proven qualified plan within normal budget, self/support likely needed, or 1 PM deadline at risk | Optional, confirmation-gated | 0 | 1 | failed candidates, proof failures, remaining budget, support rules, outliers, exact deadline risk | minimal support/self candidate plan or manual-support status | 6k-20k input, 1k-4k output | cache by failure fingerprint; persist reason | deterministic self-fallback rules |
| Donald feedback interpretation | Convert Donald's notes/tags into structured hints | Donald requests improvement or explains why a plan is bad | Optional; deterministic first | 0 normally, 0-1 when feedback is complex | 1 cheap call after deterministic parser cannot match safely | feedback text/tags, order IDs/names/areas, current plan summary | preferred/avoided order-run assignments, meetup hints, penalties, warnings | 300-2k input, 100-500 output | persist interpretation on run generation history | current deterministic parser |
| Historical-case summarization | Convert raw learning case into compact text/features for retrieval and prompts | After learning case creation/backfill or review update | Optional but recommended before M22 | offline only | 1 per changed case | one learning case, features, outcome, quality label, Donald review | compact case summary and prompt-safe lessons | 3k-20k input, 400-1.5k output | persist on learning case; no daily repeat | deterministic summary builder can do v1 |
| Learned-rule extraction | Suggest reusable operational rules from many historical cases | Admin-reviewed batch, not daily planning | Optional | offline/ad hoc | 1 per batch | positive/negative/avoid cases, Donald approvals/rejections | draft rule suggestions requiring Donald approval | 10k-40k input, 1k-3k output | persist as draft rules, inactive until tested | deterministic aggregation of labels/features |
| Uncertain historical-match assistance | Help review uncertain historical order/RO stop matches | M20C-4 review queue item is ambiguous | Optional | only when Donald opens/reviews ambiguous cases | 1 | candidate matches, names, addresses, phones if allowed, order IDs, RO stop facts | suggested match with confidence and explanation | 1k-6k input, 200-800 output | persist review suggestion, not auto-approve | existing conservative matcher plus manual review |
| Recommendation explanation | Explain why the proven plan is recommended and what risks remain | After local scoring and RO proof | Optional; cheap | 0-1 per final recommendation | 1 | ranked candidates, proof result, score breakdown, warnings | plain operational explanation for UI | 2k-8k input, 300-1k output | cache by final recommendation fingerprint | deterministic `buildOperationalExplanation` style logic |
| Embeddings | Support similarity retrieval over compact historical summaries | On case summary creation/backfill/update | Optional for v1 retrieval, useful later | offline only | 1 per changed summary/model | compact summary text, no raw daily prompt | vector | 200-1.2k input per case | persist vector by embedding model/version/summary hash | deterministic geo-feature similarity for M21 v1 |
| Schema repair | Fix malformed JSON from a model without rethinking the plan | Strict parser rejects shape but content looks recoverable | Optional | 0 | local repair first, then 1 cheap model call | invalid JSON/output only, schema error summary | corrected JSON only | 1k-4k input, 1k-4k output | no separate persistence unless final output is accepted | local JSON repair, Zod validation, reject and stop |

Key policy:
- Daily planning should normally use 0-2 LLM calls.
- Hard cap should be 3 high-value planning LLM calls in one generation session: generation, critique, rescue.
- Schema repair is separate and should be local first; a cheap model repair is allowed at most once.
- Repeated LLM calls for the same unchanged day must come from cache unless Donald adds new feedback or explicitly forces regeneration.

## 4. Prompt/context design

The prompt must be compact and operational. It should not dump raw database records.

Recommended prompt package shape:

```ts
type DeliveryAgentDailyPlanningPromptContext = {
  promptVersion: string;
  planningFingerprint: string;
  deliveryDate: string;
  profile: CompactPlanningProfile;
  orderFacts: CompactOrderFact[];
  geoFingerprint: CompactGeoFingerprint;
  localCandidateSeeds: CompactCandidateSeed[];
  historicalRetrieval: CompactHistoricalRetrievalPackage;
  hardRules: string[];
  costPolicy: CompactLlmCostPolicyView;
  previousFailure?: CompactProofFailureSummary;
  feedbackHints?: CompactDonaldFeedbackHints;
};
```

Required context:
- Exact order IDs.
- Area labels as helper signals only, not truth.
- Formatted address or normalized location text.
- Lat/lng when available.
- Coordinate confidence/source.
- Same-building clusters.
- Outliers and spread.
- Meal quantity only as low-weight operational info.
- Current driver/run profile.
- 1 PM deadline and preferred 5-10 minute buffer.
- Self/support last-resort rule.
- Handoff rules and meetup precision requirement.
- Similar historical cases and avoid-pattern lessons.
- Local deterministic seed plans so the model starts from useful options.

Must not include:
- Full raw Route Optimizer responses.
- All historical cases.
- Full customer records.
- Payment data.
- Full debug logs.
- UI state unrelated to planning.
- Repeated verbose business instructions on every call if they can be referenced by versioned prompt rules.
- Raw historical payloads when a compact case summary is available.

LLM output contract:
- Max 3 complete candidate plans.
- Every confirmed order ID assigned exactly once.
- No invented order IDs.
- No vague plan names without exact assignment.
- Each candidate must include run slots, order IDs, handoff plan, fixed/end stop intent, support/self usage, reason, and risk flags.
- The model may include a warning-only "best unproven idea", but the system must not recommend it as proven until local validation and RO proof pass.

## 5. Model-routing recommendation

The correct design is not "cheap model always" or "strongest model always." It should be model routing by operational risk.

### No LLM path

Use no LLM when:
- Confirmed order set is unchanged and a valid cached plan exists.
- Coordinate coverage is high.
- No unusual outliers exist.
- Local deterministic candidates produce a qualified 2-driver plan with the preferred buffer.
- Similar historical cases are high-confidence and profile-compatible.
- No new Donald feedback exists.
- No recent RO proof failure exists.

This path is important because easy days should not pay for tokens just to repeat obvious work.

### Cheap/smaller model path

Use a cheaper model for:
- Donald feedback interpretation after deterministic parsing is uncertain.
- Recommendation explanation.
- Schema repair after local repair fails.
- Simple candidate generation only after historical evaluation proves the cheap model is safe for that case type.

Cheap model should not be trusted by default for hard split decisions before evaluation.

### Strong reasoning model path

Use a strong model for:
- Daily candidate-plan generation on normal/complex days.
- Handoff logic with exact meetup tradeoffs.
- Outliers, fixed/end stop decisions, support/self tradeoffs.
- Low or mixed historical similarity.
- 2-driver to 3-driver transfer logic.
- Cases where a bad LLM plan would cause extra RO proof retries.

This should be the default for early M22 production trials until evaluation proves cheaper routing is safe.

### Strongest/rescue model path

Use strongest/rescue model only when:
- No proven qualified candidate exists.
- The 1 PM deadline is at serious risk.
- Self/support may be required.
- RO proof failed in a way that needs reasoning, not just local repair.
- Donald explicitly confirms rescue mode or the policy already allows the rescue threshold.

Rescue output must be labeled as rescue/manual-support planning, not normal recommendation.

## 6. Cost-policy recommendation

The system needs one source of truth for LLM and planning cost policy before LLM wiring.

Recommended Admin-side module later:
- `lib/agents/delivery/cost-policy/delivery-agent-cost-policy.ts`
- `lib/contracts/delivery-agent-cost-policy.ts`

The policy should be broader than only LLM because Donald needs one session-level view of cost:
- LLM calls/tokens
- RO optimize-preview calls
- RO estimated billable units
- geocode calls
- cache hits/misses
- rescue mode

Recommended policy shape:

```ts
type DeliveryAgentCostPolicy = {
  policyVersion: string;
  pricingVersion: string;
  mode: "normal" | "dry_run" | "llm_disabled";
  models: {
    cheap: ModelRef;
    strong: ModelRef;
    rescue: ModelRef;
    embedding?: ModelRef;
  };
  maxTotalLlmCallsPerGeneration: number;
  maxHighValuePlanningCallsPerGeneration: number;
  maxCheapModelCallsPerGeneration: number;
  maxStrongModelCallsPerGeneration: number;
  maxRescueModelCallsPerGeneration: number;
  maxSchemaRepairModelCalls: number;
  maxInputTokensPerCall: number;
  maxOutputTokensPerCall: number;
  maxDetailedHistoricalCases: number;
  maxCompactHistoricalLessons: number;
  maxEstimatedNormalSessionCostCents: number;
  maxEstimatedRescueSessionCostCents: number;
  requireDonaldConfirmationForRescue: boolean;
  allowNoLlmEasyDay: boolean;
  cacheTtlHours: number;
};
```

Recommended initial defaults:
- `maxHighValuePlanningCallsPerGeneration`: 3
- `maxTotalLlmCallsPerGeneration`: 4, counting one optional cheap schema repair
- `maxCheapModelCallsPerGeneration`: 2
- `maxStrongModelCallsPerGeneration`: 1 normal, 2 only if critique is strong and policy allows it
- `maxRescueModelCallsPerGeneration`: 1
- `maxSchemaRepairModelCalls`: 1 after local repair fails
- `maxDetailedHistoricalCases`: 3
- `maxCompactHistoricalLessons`: 12
- `maxInputTokensPerCall`: provider/model dependent; start conservative and log actuals
- `maxOutputTokensPerCall`: provider/model dependent; start conservative and validate JSON size
- `maxEstimatedNormalSessionCostCents`: start at 75 cents in configured billing currency
- `maxEstimatedRescueSessionCostCents`: start at 200 cents with Donald confirmation
- `allowNoLlmEasyDay`: true

Why these defaults:
- They are high enough to let the agent think properly on complex days.
- They prevent repeated retry loops.
- They do not rely on Google or LLM free tiers.
- They force real cost visibility before the model layer grows.

Important: exact model prices must live in config, not in comments or UI copy. The app should calculate estimated session cost from actual model IDs, pricing version, token counts, and cache hits.

## 7. Cache/fingerprint design

A planning cache is required so the same unchanged day does not pay for repeated LLM calls.

Recommended fingerprint:

```ts
type DeliveryAgentPlanningFingerprint = {
  fingerprintVersion: string;
  deliveryDate: string;
  confirmedOrderSetHash: string;
  orderCoordinateHash: string;
  planningProfileId: string;
  planningProfileVersion: string;
  learningCorpusVersion: string;
  retrievedLearningCaseIdsHash: string;
  learnedRuleVersion: string;
  promptVersion: string;
  modelProvider: string;
  modelId: string;
  modelRoutingPolicyVersion: string;
  costPolicyVersion: string;
  donaldFeedbackHash?: string;
  forceRegenerationReason?: string;
};
```

Cache layers:
- Daily planning context package cache.
- Historical retrieval package cache.
- LLM candidate generation result cache.
- Candidate critique/improvement cache.
- Rescue result cache.
- Recommendation explanation cache.
- Historical case summary cache.
- Embedding cache.

Cache invalidation should happen when:
- Confirmed order set changes.
- Any relevant address/lat/lng changes.
- Planning profile changes.
- Learning corpus or learned rules change.
- Prompt version changes.
- Model/provider or model routing policy changes.
- Donald adds new feedback.
- Cost policy changes in a way that affects allowed output.
- Donald explicitly forces regeneration.

Repeated clicks with no data changes should return cached LLM/candidate outputs and should not burn tokens.

## 8. Retry-loop design

The retry loop must preserve quality without becoming expensive.

Recommended normal flow:
1. Build deterministic local facts and candidate seeds.
2. If the day qualifies as easy, skip LLM and use local deterministic plan.
3. If not easy, call the selected generation model once.
4. Parse and validate strict JSON locally.
5. If JSON is malformed, attempt local repair once.
6. If local repair fails and content seems recoverable, call cheap schema repair once.
7. Run local validation and scoring.
8. If candidates are valid and sufficiently diverse, preview top serious finalists through RO within existing preview budget.
9. If valid but weak, run one critique/improvement call.
10. If still no qualified proven plan, enter rescue only if policy and Donald confirmation allow it.

Hard caps:
- Main generation: max 1.
- Critique/improvement: max 1.
- Rescue/support: max 1.
- Schema repair model: max 1 cheap call.
- High-value planning calls: max 3.

Stop conditions:
- LLM cost policy exhausted.
- RO preview budget exhausted.
- Candidate output repeatedly fails local validation.
- Candidate diversity is not improved by critique.
- No new order/profile/feedback/fingerprint change exists.
- Rescue is required but not confirmed.

When budget is exhausted:
- Return partial results.
- Mark status as `budget_exhausted`.
- Recommend only among proven qualified candidates.
- If no proven qualified candidate exists, return `no_qualified_plan` or `manual_support_required`.
- Show Donald the best unproven idea only as warning-only, not as the recommendation.

## 9. Historical evaluation design

Before choosing a cheap model for routing decisions, the system needs an offline evaluation harness.

Data set:
- Start with 30-60 historical delivery days from `DeliveryAgentLearningCase`.
- Include positive, weak-positive, negative, avoid-pattern, and uncertain cases.
- Include driver-start-delay normalized cases so a good route is not punished only because a driver started late.
- Include profile compatibility: same profile, transferable profile, different profile, unknown.
- Include 2-driver historical cases and later 3-driver target profiles to test transfer logic.

Evaluation modes:
- Deterministic baseline only.
- Cheap model generation.
- Strong model generation.
- Strong model plus critique.
- Rescue model on hard/no-qualified days only.

Default harness should not call paid RO. It should evaluate against:
- historical RO outputs already stored
- local validation
- local geo features
- existing outcome/route-shape/stop-control features
- Donald approvals/rejections when available

Optional paid proof tests can be run later on a tiny manually approved sample with strict budgets.

Metrics:
- Every confirmed order assigned exactly once.
- No invented/missing order IDs.
- Valid run slots and profile-compatible roles.
- Correct use of self/support as last resort.
- Deadline risk and buffer quality.
- Handoff reasonableness.
- Fixed/end stop correctness.
- Area/outlier grouping quality.
- Similarity to successful historical patterns.
- Avoidance of historical avoid-patterns.
- Donald approval alignment.
- RO preview calls required after model output.
- Token cost per successful qualified plan.
- Failure modes and manual correction frequency.

Release gate:
- Do not let a cheap model own exact route splitting until it passes historical evaluation for the specific day type.
- Early production M22 should use strong model by default for complex days.
- Cheap model can take over only where the eval harness proves no meaningful quality loss and no increase in RO retries.

## 10. Cost ledger design

Donald needs to see actual daily cost behavior, not just promises.

Recommended ledger fields:

```ts
type DeliveryAgentPlanningCostLedger = {
  deliveryDate: string;
  planningSessionId: string;
  correlationId: string;
  planningFingerprint: string;
  costPolicyVersion: string;
  pricingVersion: string;
  llm: {
    calls: Array<{
      callType: string;
      provider: string;
      modelId: string;
      cached: boolean;
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
      estimatedCostCents?: number;
      status: "success" | "failed" | "cache_hit" | "skipped";
    }>;
    estimatedTotalCostCents: number;
  };
  routeOptimizer: {
    optimizePreviewCallsUsed: number;
    repairPreviewCallsUsed: number;
    geocodeRequestsEstimated?: number;
    directionsRequestsEstimated?: number;
    routeOptimizationBillableUnitsEstimated?: number;
    estimatedBillableUnits?: number;
  };
  cache: {
    planningCacheHit: boolean;
    llmCandidateCacheHit: boolean;
    retrievalCacheHit: boolean;
    previewCacheHit: boolean;
  };
  candidates: {
    generated: number;
    locallyValid: number;
    roPreviewed: number;
    provenQualified: number;
  };
  status:
    | "qualified_plan_found"
    | "budget_exhausted"
    | "no_qualified_plan"
    | "manual_support_required"
    | "failed";
  warnings: string[];
};
```

Persistence options:
- Add a compact ledger summary on `DeliveryAgentRun` first.
- Later add a separate `DeliveryAgentCostLedgerEntry` collection if detailed per-call audit grows large.

UI should eventually show:
- LLM calls used.
- RO previews used.
- cache hits.
- estimated cost.
- whether rescue mode was used.
- warnings when budget caused partial results.

## 11. Questions for Donald

Business budget questions:
- What daily normal planning cost feels acceptable after free tiers are ignored: under $0.50, under $1.00, or another target?
- What rescue-day cost is acceptable when the alternative is you manually helping: under $2.00, under $5.00, or another target?
- What monthly total should trigger an automatic pause or warning?

Quality questions:
- For the first M22 production trial, do you prefer strong model by default on all non-easy days, then downgrade only after evaluation proves cheaper models work?
- Should Donald see rejected/unproven model ideas, or only the proven qualified recommendation plus a small warning area?
- Should self/support require explicit confirmation every time, or only when the system thinks 2 hired drivers cannot finish before 1 PM?

Historical evaluation questions:
- Which historical days are "gold" examples that you remember as good delivery plans?
- Which historical days were bad and should become avoid-pattern examples?
- Do you want to personally approve the first 10-20 learning labels before model evaluation?

Provider/model questions:
- Do you have a preferred LLM provider because of billing, Vercel setup, privacy, or Cursor/OpenAI account setup?
- Should the first implementation be provider-agnostic so switching model vendors later is easier?

Address/data questions:
- Should address autocomplete become a separate milestone before full production launch, or after M22 LLM planning is proven?
- Are customer phone/name fields allowed inside uncertain historical matching prompts, or should we keep LLM prompts address/order-ID focused unless manual review needs more?

## 12. Go/no-go recommendation

Go:
- Continue with LLM-COST-0A/0B architecture implementation before wiring any provider.
- Continue M21 similarity retrieval if it stays local, uses existing learning cases, and does not call paid APIs.
- Use Extra High model level for the next LLM cost-policy architecture milestone.

No-go:
- Do not wire daily LLM candidate generation yet.
- Do not send raw historical payloads into prompts.
- Do not let cheap model output become the recommendation without historical evaluation.
- Do not create open-ended retry loops.
- Do not rely on free tiers.
- Do not let cost controls hide bad/unproven plans as if they are recommended.

Overall verdict:
- The current project direction is good enough to continue, but the LLM layer needs this added cost-quality structure before M22.
- This is a refinement, not a restart.
- If implemented in this order, the agent can be both high-quality and cost-controlled.

## 13. Recommended next milestone

Recommended immediate milestone: LLM-COST-0A - Admin LLM cost policy, call contracts, and planning fingerprint design.

Model level recommendation for next milestone:
- Extra High.

Reason:
- This next milestone sets the architecture that prevents token waste and quality loss.
- A wrong structure here would be expensive to unwind later.

Suggested milestone sequence:

### LLM-COST-0A - Cost policy and call contracts

Scope:
- Add typed contracts for LLM call types, cost policy, model routing classes, token/cost estimate records, and status enums.
- No provider wiring.
- No paid calls.
- No UI required.

Key files likely:
- `lib/contracts/delivery-agent-cost-policy.ts`
- `lib/agents/delivery/cost-policy/delivery-agent-cost-policy.ts`
- tests for default policy and caps

### LLM-COST-0B - Planning fingerprint and LLM cache contracts

Scope:
- Define fingerprint builder for order set, coordinates, profile, prompt, model, learning corpus, cost policy, and feedback.
- Add no-provider cache key helpers.
- No actual LLM calls.

### LLM-COST-0C - Historical compact retrieval package

Scope:
- Build compact prompt-safe historical case summaries from learning cases.
- Keep raw snapshots out of daily prompt context.
- M21 retrieval can use deterministic feature similarity first.

### LLM-COST-0D - Offline model evaluation harness

Scope:
- Build eval harness that can run against historical cases.
- Default mode should not call paid providers.
- Provider-backed model eval later must require explicit budget/env enablement.

### LLM-COST-0E - Cost ledger and observability

Scope:
- Add planning-session cost ledger contract/storage summary.
- Track LLM estimates once provider exists and RO estimates already present.
- Prepare UI-readable summary, but full UI can wait.

### M21 - Similarity retrieval

Scope:
- Retrieve profile-compatible historical cases by geo spread, clusters, outliers, route shape, outcome, and labels.
- No LLM required for v1.

### M22 - LLM complete candidate plans

Scope:
- Wire provider behind the policy, fingerprint, cache, and eval gates.
- Strong model default on complex days until evaluation proves cheaper routing works.

### M23 - Budgeted proof and recommendation loop

Scope:
- Combine LLM candidates, local validation/scoring, RO proof, retry caps, and Donald review.
- Recommend only proven qualified plans.

## 14. Report path

`docs/delivery-agent-llm-cost-quality-architecture-checkpoint.md`

## 15. Confirmation no app code was changed

Confirmed. This checkpoint created only this planning report. It did not modify app code, models, APIs, UI, tests, or business logic.

## 16. Confirmation no paid APIs or LLM calls were made

Confirmed. This checkpoint used local repo inspection only. No paid LLM, Google, Route Optimizer, or external API call was made.

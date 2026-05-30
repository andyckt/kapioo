# Delivery Agent Learning Log

This document describes how `DeliveryAgentRun` records support future Delivery Agent learning.

Related: [delivery-agent-run-learning-readiness.md](./delivery-agent-run-learning-readiness.md)

## Purpose

`DeliveryAgentRun` is not only an audit log for duplicate prevention and troubleshooting. It is also the **future learning record** for how Donald plans daily delivery routes.

Each run log captures:

- what the agent attempted
- what Donald reviewed
- location-first route decisions
- repair actions and outcomes

## Location-first learning

The learning system is **location-first**, not customer/order-ID-first.

Order IDs (`orderIds`, `invalidOrders[].orderId`) are **technical join keys** when needed to link back to Kapioo orders. Learning should focus on:

- stop lat/lng and normalized addresses
- location clusters and zones
- start, meet-up, and end locations
- route direction and shape
- `fixed_stop_position` and `is_end_point` usage
- finish time before 1 PM

Store location-first data primarily in `locationArtifacts` and extended `routeOptimizerRuns` snapshots.

## Artifact buckets

Three optional `Mixed` fields hold versioned learning payloads. Each TypeScript contract includes an `artifactVersion` string so parsers can evolve safely.

### `planningArtifacts`

Planning and candidate evaluation:

- `candidatePlansTested`
- `selectedPlanSummary`
- `scoreBreakdown`
- `agentReasoningSummary`
- `constraintApplicationLog`
- `routeShapeIssuesDetected`
- `finalAcceptedPlan`

Contract version: `planning-artifacts-v1`

### `locationArtifacts`

Location-first stop and route geometry:

- `stopSnapshots` (lat/lng, normalized address, area, cluster id)
- `fixedStopUsage`, `endpointUsage`
- `handoffEvents` (meet-up / handoff between runs)
- `startLocation`, `meetUpLocation`, `endLocation`

Contract version: `location-artifacts-v1`

### `learningArtifacts`

Review feedback, outcomes, and profile evolution:

- `historicalComparison`
- `improvementSuggestions`, `approvedRuleChanges`
- `actualOutcome`
- `retryHistory`, `rejectionHistory`, `manualEdits`

Contract version: `learning-artifacts-v1`

## Review vs agent status

Two separate status concepts:

| Field | Meaning |
|-------|---------|
| `status` | Agent/Route Optimizer pipeline: `draft`, `previewing`, `ready_for_review`, `created`, `failed`, `cancelled` |
| `reviewStatus` | Donald's human review: `pending`, `approved`, `edited`, `rejected` |

When the agent finishes previewing, `status` may become `ready_for_review`. Donald's decision is stored separately in `reviewStatus`, `reviewedAt`, `reviewedBy`, `donaldFeedbackText`, and `donaldFeedbackTags`.

## Version fields

| Field | Meaning | Example |
|-------|---------|---------|
| `version` | **Log schema version** — shape of the DeliveryAgentRun document itself | `m4-v1` |
| `profileVersion` | **Planning profile version** — which routing profile/rules were used | `daily-v1.2` |

Do not confuse these. The DB field name `version` is kept for backward compatibility.

## Helpers (M4 + M4B)

| Helper | Purpose |
|--------|---------|
| `createDeliveryAgentRunLog` | Create attempt with order snapshot |
| `recordDonaldReview` | Store Donald's approve/edit/reject feedback |
| `attachPlanningArtifacts` | Store planning/candidate data |
| `attachLocationArtifacts` | Store location-first stop/cluster data |
| `attachLearningArtifacts` | Store outcomes, comparisons, manual edits |
| `attachRouteOptimizerRuns` | Append RO run metadata and optional route geometry |

## What is not built yet

Milestone 4B adds schema, types, and helpers only. Not included:

- Admin UI for review
- Route planning or candidate generation
- Route Optimizer calls
- Historical learning or backtesting jobs

Future milestones will populate these fields during preview, review, and outcome capture.

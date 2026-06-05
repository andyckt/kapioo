import { selectBestCandidatePlan } from "@/lib/agents/delivery/best-plan/select-best-candidate-plan";
import type { CandidateAssignedRun } from "@/lib/agents/delivery/best-plan/types";
import { randomUUID } from "crypto";
import { compareCandidateDeadline } from "@/lib/agents/delivery/candidate-plans/compare-candidate-deadline";
import { expandFullCandidateVariants } from "@/lib/agents/delivery/candidate-plans/expand-full-candidate-variants";
import { generateCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/generate-candidate-plans";
import { previewCandidateHandoff } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import type { HandoffRunChainOverrides } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import {
  createDeliveryAgentPreviewBudget,
  type DeliveryAgentPreviewBudgetAction,
  type DeliveryAgentPreviewBudgetConfig,
} from "@/lib/agents/delivery/candidate-plans/preview-budget";
import { repairCandidateRoutePreview } from "@/lib/agents/delivery/candidate-plans/preview-candidate-route-repair";
import {
  buildCandidatePreviewCacheKey,
  markCandidatePreviewCacheMiss,
  readCandidatePreviewCache,
  writeCandidatePreviewCache,
} from "@/lib/agents/delivery/candidate-plans/preview-cache";
import { buildHandoffOverridesFromHints } from "@/lib/agents/delivery/feedback/apply-planning-hints";
import { collectCoordinateCoverageWarnings } from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";
import type { PlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import { getEnrichedDeliveryOrdersForRouting } from "@/lib/agents/delivery/geocode";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidatePlanPreviewCore,
  DeliveryAgentCandidatePreviewStatus,
  DeliveryAgentCandidateRepairSummary,
  DeliveryAgentCandidateRunPreview,
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentCandidatePlan,
} from "@/lib/contracts/delivery-agent";
import { RouteOptimizerConfigError } from "@/lib/integrations/route-optimizer/errors";
import type { FullCandidateVariant } from "@/lib/agents/delivery/candidate-plans/expand-full-candidate-variants";

const CANDIDATE_ROUTE_PREVIEW_NOTES =
  "Each candidate is now a full route combination: split + meet-up + start timing + repair result. These previews include handoff, route-shape repair, and a recommended plan ranking. This is a recommendation only—final run creation will be added later.";

const PREVIEW_CANDIDATE_THROTTLE_MS = process.env.NODE_ENV === "test" ? 0 : 150;

const EMPTY_REPAIR_SUMMARY: DeliveryAgentCandidateRepairSummary = {
  repairAttempted: false,
  repairSucceeded: false,
  issuesDetected: [],
  repairActionsApplied: [],
  warnings: [],
};

function buildRoutingStopMap(stops: RoutingStop[]): Map<string, RoutingStop> {
  return new Map(stops.map((stop) => [stop.orderId, stop]));
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRouteOptimizerRateLimitMessage(message: string | undefined): boolean {
  return Boolean(message && /RATE_LIMITED|rate limit|429/i.test(message));
}

function candidateHitRateLimit(candidate: DeliveryAgentCandidatePlanPreviewCore): boolean {
  return (
    candidate.errors.some(isRouteOptimizerRateLimitMessage) ||
    candidate.runs.some((run) => isRouteOptimizerRateLimitMessage(run.previewError))
  );
}

async function throttleCandidatePreview(): Promise<void> {
  if (PREVIEW_CANDIDATE_THROTTLE_MS <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, PREVIEW_CANDIDATE_THROTTLE_MS));
}

function buildFailedRunPreview(
  runSlot: string,
  driverName: string,
  role: string,
  stopCount: number,
  previewError: string
): DeliveryAgentCandidateRunPreview {
  return {
    runSlot,
    driverName,
    role,
    stopCount,
    optimizedStopCount: 0,
    optimizedStops: [],
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "failed",
    previewError,
  };
}

function resolveCandidatePreviewStatus(
  runPreviews: DeliveryAgentCandidateRunPreview[]
): DeliveryAgentCandidatePreviewStatus {
  const previewableRuns = runPreviews.filter((run) => run.previewStatus !== "skipped_no_stops");

  if (previewableRuns.length === 0) {
    return "failed";
  }

  const successCount = previewableRuns.filter((run) => run.previewStatus === "previewed").length;
  const failureCount = previewableRuns.filter((run) => run.previewStatus === "failed").length;

  if (successCount === previewableRuns.length) {
    return "previewed";
  }

  if (failureCount === previewableRuns.length) {
    return "failed";
  }

  return "partial_failed";
}

function collectCandidatePreviewErrors(
  runPreviews: DeliveryAgentCandidateRunPreview[]
): string[] {
  return runPreviews
    .filter((run) => run.previewStatus === "failed" && run.previewError)
    .map((run) => `Run ${run.runSlot}: ${run.previewError}`);
}

function buildAssignmentForVariant(variant: FullCandidateVariant): CandidateAssignedRun[] {
  return variant.plan.runs.map((run) => ({
    runSlot: run.runSlot,
    role: run.role,
    stops: run.stops.map((stop) => ({
      orderId: stop.orderId,
      area: stop.area,
      lat: stop.lat,
      lng: stop.lng,
      totalMealQuantity: stop.totalMealQuantity,
    })),
  }));
}

function buildPreviewCorrelationId(input: {
  action: DeliveryAgentPreviewBudgetAction;
  deliveryDate: string;
}): string {
  return `delivery-agent:${input.action}:${input.deliveryDate}:${randomUUID()}`;
}

function shouldCacheCandidatePreviewResponse(
  response: DeliveryAgentPreviewCandidatePlansResponse
): boolean {
  return (
    response.costGuardrail?.status === "within_budget" &&
    response.candidates.some((candidate) => candidate.status === "previewed")
  );
}

export function selectPreviewFinalists(input: {
  variants: FullCandidateVariant[];
  maxFullCandidateVariants: number;
}): { finalists: FullCandidateVariant[]; warnings: string[] } {
  const max = Math.max(0, input.maxFullCandidateVariants);
  const warnings: string[] = [];

  if (max === 0 || input.variants.length === 0) {
    return {
      finalists: [],
      warnings:
        input.variants.length > 0
          ? ["Preview budget is zero; no paid candidate previews were run."]
          : [],
    };
  }

  if (input.variants.length <= max) {
    return { finalists: input.variants, warnings };
  }

  const byPriority = [...input.variants].sort(
    (left, right) => right.previewPriorityScore - left.previewPriorityScore
  );
  const selected: FullCandidateVariant[] = [];
  const selectedIds = new Set<string>();

  const addVariant = (variant: FullCandidateVariant | undefined) => {
    if (!variant || selected.length >= max || selectedIds.has(variant.plan.candidateId)) {
      return;
    }
    selected.push(variant);
    selectedIds.add(variant.plan.candidateId);
  };

  addVariant(byPriority[0]);

  for (const variant of byPriority) {
    const alreadyHasBaseSplit = selected.some(
      (entry) =>
        entry.combination.baseSplitCandidateId === variant.combination.baseSplitCandidateId
    );
    if (!alreadyHasBaseSplit) {
      addVariant(variant);
    }
  }

  if (!selected.some((variant) => variant.combination.selfUsageStrategy === "self_fallback")) {
    addVariant(
      byPriority.find((variant) => variant.combination.selfUsageStrategy === "self_fallback")
    );
  }

  if (!selected.some((variant) => variant.combination.meetupFixedStopPosition === 2)) {
    addVariant(byPriority.find((variant) => variant.combination.meetupFixedStopPosition === 2));
  }

  for (const variant of byPriority) {
    addVariant(variant);
  }

  warnings.push(
    `Quality-preserving budget selected ${selected.length} finalist candidate(s) from ${input.variants.length} local variant(s), prioritizing high-scored meet-up options, different base splits, and self-fallback coverage.`
  );

  return { finalists: selected, warnings };
}

async function previewCandidatePlan(input: {
  deliveryDate: string;
  variant: FullCandidateVariant;
  kitchenAddress: string;
  profile: ReturnType<typeof getDeliveryPlanningProfile>;
  routingStopByOrderId: Map<string, RoutingStop>;
  handoffOverrides?: HandoffRunChainOverrides;
  budget: ReturnType<typeof createDeliveryAgentPreviewBudget>;
}): Promise<DeliveryAgentCandidatePlanPreviewCore> {
  const handoffResult = await previewCandidateHandoff({
    deliveryDate: input.deliveryDate,
    candidate: input.variant.plan,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    meetupSelection: input.variant.meetupSelection,
    handoffOverrides: input.handoffOverrides,
    budget: input.budget,
  });

  const planSummary = {
    runCount: input.variant.plan.summary.runCount,
    totalStops: input.variant.plan.summary.totalStops,
    selfUsed: input.variant.plan.summary.selfUsed,
    selfStopCount: input.variant.plan.summary.selfStopCount,
  };

  const repairResult = await repairCandidateRoutePreview({
    deliveryDate: input.deliveryDate,
    candidate: input.variant.plan,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    handoffResult,
    budget: input.budget,
    planSummary,
  });

  const summary = compareCandidateDeadline({
    deliveryDate: input.deliveryDate,
    profile: input.profile,
    runPreviews: repairResult.runPreviews,
    planSummary,
  });

  const warnings = [
    ...new Set([
      ...input.variant.plan.warnings,
      ...input.variant.combination.variantWarnings,
      ...summary.blockingIssues,
      ...repairResult.candidateRepairSummary.warnings,
    ]),
  ];

  return {
    candidateId: input.variant.plan.candidateId,
    name: input.variant.plan.name,
    strategyType: input.variant.plan.strategyType,
    status: resolveCandidatePreviewStatus(repairResult.runPreviews),
    runs: repairResult.runPreviews,
    summary,
    handoffPlan: repairResult.handoffPlan,
    candidateRepairSummary: repairResult.candidateRepairSummary,
    warnings,
    errors: collectCandidatePreviewErrors(repairResult.runPreviews),
    assumptions: [...new Set([...repairResult.assumptions, ...input.variant.combination.variantAssumptions])],
    combination: input.variant.combination,
  };
}

export async function previewCandidatePlansPipeline(input: {
  deliveryDate: string;
  profileId?: string;
  profileVersion?: string;
  baseCandidates?: DeliveryAgentCandidatePlan[];
  planningHints?: PlanningHints;
  deliveryAgentRunId?: string;
  previewBudget?: {
    action?: DeliveryAgentPreviewBudgetAction;
    correlationId?: string;
    config?: Partial<DeliveryAgentPreviewBudgetConfig>;
  };
}): Promise<DeliveryAgentPreviewCandidatePlansResponse> {
  const budgetAction = input.previewBudget?.action ?? "candidate_preview";
  const budget = createDeliveryAgentPreviewBudget({
    action: budgetAction,
    correlationId:
      input.previewBudget?.correlationId ??
      buildPreviewCorrelationId({ action: budgetAction, deliveryDate: input.deliveryDate }),
    config: input.previewBudget?.config,
  });

  const profile = getDeliveryPlanningProfile(input.profileId);
  const kitchenAddress = getKapiooKitchenStartLocation();
  const generation = input.baseCandidates
    ? {
        deliveryDate: input.deliveryDate,
        profileId: profile.profileId,
        profileVersion: input.profileVersion ?? profile.profileVersion,
        candidates: input.baseCandidates,
        notes: "",
      }
    : await generateCandidatePlansForAgent(input.deliveryDate, input.profileId);

  const enriched = await getEnrichedDeliveryOrdersForRouting({
    deliveryDate: input.deliveryDate,
    statuses: ["confirmed"],
    deliveryAgentRunId: input.deliveryAgentRunId,
  });
  const routingStopByOrderId = buildRoutingStopMap(enriched.routing.stops);
  const coordinateCoverage = enriched.coordinateCoverage;
  const geocodeEnrichment = enriched.geocodeEnrichment;
  const previewCacheKey = buildCandidatePreviewCacheKey({
    deliveryDate: input.deliveryDate,
    profileId: generation.profileId,
    profileVersion: generation.profileVersion,
    deliveryAgentRunId: input.deliveryAgentRunId,
    action: budgetAction,
    budgetConfig: budget.config,
    planningHints: input.planningHints,
    candidates: generation.candidates,
    routingStops: enriched.routing.stops,
    coordinateCoverage,
  });
  const cachedPreview = readCandidatePreviewCache(previewCacheKey, {
    correlationId: budget.correlationId,
  });
  if (cachedPreview) {
    return cachedPreview;
  }

  const expansion = expandFullCandidateVariants({
    splits: generation.candidates,
    profile,
    planningHints: input.planningHints,
  });
  const finalistSelection = selectPreviewFinalists({
    variants: expansion.variants,
    maxFullCandidateVariants: budget.config.maxFullCandidateVariants,
  });
  budget.recordVariantSelection({
    considered: expansion.variants.length,
    selected: finalistSelection.finalists.length,
    skipped: Math.max(expansion.variants.length - finalistSelection.finalists.length, 0),
  });

  const handoffOverrides = input.planningHints
    ? buildHandoffOverridesFromHints(input.planningHints)
    : undefined;

  const candidates: DeliveryAgentCandidatePlanPreviewCore[] = [];
  const assignmentByCandidateId = new Map<string, CandidateAssignedRun[]>();
  let stoppedDueToRateLimit = false;
  let previewedVariantCount = 0;

  for (const variant of finalistSelection.finalists) {
    assignmentByCandidateId.set(variant.plan.candidateId, buildAssignmentForVariant(variant));

    try {
      if (previewedVariantCount > 0) {
        await throttleCandidatePreview();
      }
      const preview = await previewCandidatePlan({
        deliveryDate: input.deliveryDate,
        variant,
        kitchenAddress,
        profile,
        routingStopByOrderId,
        handoffOverrides:
          handoffOverrides && Object.keys(handoffOverrides).length > 0
            ? handoffOverrides
            : undefined,
        budget,
      });
      candidates.push(preview);
      previewedVariantCount += 1;
      budget.recordVariantPreviewed();
      if (candidateHitRateLimit(preview)) {
        stoppedDueToRateLimit = true;
        budget.markRateLimited();
        break;
      }
      if (budget.status === "budget_exhausted") {
        break;
      }
    } catch (error) {
      if (error instanceof RouteOptimizerConfigError) {
        throw error;
      }

      const failedRuns = variant.plan.runs.map((run) =>
        buildFailedRunPreview(
          run.runSlot,
          run.driverName,
          run.role,
          run.stopCount,
          readErrorMessage(error)
        )
      );

      const summary = compareCandidateDeadline({
        deliveryDate: input.deliveryDate,
        profile,
        runPreviews: failedRuns,
        planSummary: {
          runCount: variant.plan.summary.runCount,
          totalStops: variant.plan.summary.totalStops,
          selfUsed: variant.plan.summary.selfUsed,
          selfStopCount: variant.plan.summary.selfStopCount,
        },
      });

      candidates.push({
        candidateId: variant.plan.candidateId,
        name: variant.plan.name,
        strategyType: variant.plan.strategyType,
        status: "failed",
        runs: failedRuns,
        summary,
        handoffPlan: {
          providerRunSlot: profile.handoffRules.providerRunSlot,
          receiverRunSlot: profile.handoffRules.receiverRunSlots[0] ?? "B",
          selectedMeetup: null,
          handoffSkipped: true,
          skipReason: readErrorMessage(error),
        },
        candidateRepairSummary: EMPTY_REPAIR_SUMMARY,
        warnings: [...variant.plan.warnings, ...summary.blockingIssues],
        errors: [readErrorMessage(error)],
        assumptions: variant.combination.variantAssumptions,
        combination: variant.combination,
      });
      previewedVariantCount += 1;
      budget.recordVariantPreviewed();

      if (isRouteOptimizerRateLimitMessage(readErrorMessage(error))) {
        stoppedDueToRateLimit = true;
        budget.markRateLimited();
        break;
      }
      if (budget.status === "budget_exhausted") {
        break;
      }
    }
  }

  const selection = selectBestCandidatePlan({
    profile,
    candidates,
    assignmentByCandidateId,
    coordinateCoverage,
    feedbackPenalties: input.planningHints?.interpretation.penalties,
    preferredOrderRunOverrides: input.planningHints?.orderRunOverrides,
  });

  const selectionWarnings = [
    ...finalistSelection.warnings,
    ...expansion.expansionWarnings,
    ...budget.summary().warnings,
    ...selection.selectionWarnings,
    ...collectCoordinateCoverageWarnings({
      alerts: coordinateCoverage.alerts,
      stopsFallback: coordinateCoverage.stopsFallback,
      recommendationConfidence: coordinateCoverage.recommendationConfidence,
    }),
  ];

  if (stoppedDueToRateLimit) {
    selectionWarnings.push(
      "Route Optimizer preview was rate limited. Returned partial candidate previews; wait before previewing or creating final runs again."
    );
  }

  if (candidates.length > 0 && selection.recommendedCandidateId === null && candidates.every((c) => c.status === "failed")) {
    selectionWarnings.push("No valid full candidate variants could be previewed.");
  }

  const costGuardrail = budget.summary();

  const response: DeliveryAgentPreviewCandidatePlansResponse = {
    deliveryDate: generation.deliveryDate,
    profileId: generation.profileId,
    profileVersion: generation.profileVersion,
    candidates: selection.rankedCandidates,
    recommendedCandidateId: selection.recommendedCandidateId,
    recommendedPlanSummary: selection.recommendedPlanSummary,
    selectionNotes: selection.selectionNotes,
    selectionWarnings,
    expansionWarnings: expansion.expansionWarnings,
    notes: CANDIDATE_ROUTE_PREVIEW_NOTES,
    coordinateCoverage,
    geocodeEnrichment,
    costGuardrail,
  };

  if (shouldCacheCandidatePreviewResponse(response)) {
    return writeCandidatePreviewCache({
      cacheKey: previewCacheKey,
      response,
    });
  }

  return markCandidatePreviewCacheMiss({
    cacheKey: previewCacheKey,
    response,
  });
}

export async function previewCandidatePlansForAgent(
  deliveryDate: string,
  profileId?: string,
  options?: {
    correlationId?: string;
    budgetConfig?: Partial<DeliveryAgentPreviewBudgetConfig>;
  }
): Promise<DeliveryAgentPreviewCandidatePlansResponse> {
  return previewCandidatePlansPipeline({
    deliveryDate,
    profileId,
    previewBudget: {
      action: "candidate_preview",
      correlationId: options?.correlationId,
      config: options?.budgetConfig,
    },
  });
}

export { compareCandidateDeadline };

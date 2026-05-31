import { selectBestCandidatePlan } from "@/lib/agents/delivery/best-plan/select-best-candidate-plan";
import type { CandidateAssignedRun } from "@/lib/agents/delivery/best-plan/types";
import { compareCandidateDeadline } from "@/lib/agents/delivery/candidate-plans/compare-candidate-deadline";
import { expandFullCandidateVariants } from "@/lib/agents/delivery/candidate-plans/expand-full-candidate-variants";
import { generateCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/generate-candidate-plans";
import { previewCandidateHandoff } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import type { HandoffRunChainOverrides } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import { repairCandidateRoutePreview } from "@/lib/agents/delivery/candidate-plans/preview-candidate-route-repair";
import { buildHandoffOverridesFromHints } from "@/lib/agents/delivery/feedback/apply-planning-hints";
import type { PlanningHints } from "@/lib/agents/delivery/feedback/planning-hints";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
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

async function previewCandidatePlan(input: {
  deliveryDate: string;
  variant: FullCandidateVariant;
  kitchenAddress: string;
  profile: ReturnType<typeof getDeliveryPlanningProfile>;
  routingStopByOrderId: Map<string, RoutingStop>;
  handoffOverrides?: HandoffRunChainOverrides;
}): Promise<DeliveryAgentCandidatePlanPreviewCore> {
  const handoffResult = await previewCandidateHandoff({
    deliveryDate: input.deliveryDate,
    candidate: input.variant.plan,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    meetupSelection: input.variant.meetupSelection,
    handoffOverrides: input.handoffOverrides,
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
    planSummary,
  });

  const summary = compareCandidateDeadline({
    deliveryDate: input.deliveryDate,
    profile: input.profile,
    runPreviews: repairResult.runPreviews,
    planSummary,
  });

  const warnings = [
    ...input.variant.plan.warnings,
    ...input.variant.combination.variantWarnings,
    ...summary.blockingIssues,
    ...repairResult.candidateRepairSummary.warnings,
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
}): Promise<DeliveryAgentPreviewCandidatePlansResponse> {
  const profile = getDeliveryPlanningProfile(input.profileId);
  const kitchenAddress = getKapiooKitchenStartLocation();
  const generation = input.baseCandidates
    ? {
        deliveryDate: input.deliveryDate,
        profileId: profile.profileId,
        profileVersion: input.profileVersion ?? profile.version,
        candidates: input.baseCandidates,
        notes: "",
      }
    : await generateCandidatePlansForAgent(input.deliveryDate, input.profileId);

  const routing = await getDeliveryOrdersForRouting({
    deliveryDate: input.deliveryDate,
    statuses: ["confirmed"],
  });
  const routingStopByOrderId = buildRoutingStopMap(routing.stops);

  const expansion = expandFullCandidateVariants({
    splits: generation.candidates,
    profile,
    planningHints: input.planningHints,
  });

  const handoffOverrides = input.planningHints
    ? buildHandoffOverridesFromHints(input.planningHints)
    : undefined;

  const candidates: DeliveryAgentCandidatePlanPreviewCore[] = [];
  const assignmentByCandidateId = new Map<string, CandidateAssignedRun[]>();
  let stoppedDueToRateLimit = false;
  let previewedVariantCount = 0;

  for (const variant of expansion.variants) {
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
      });
      candidates.push(preview);
      previewedVariantCount += 1;
      if (candidateHitRateLimit(preview)) {
        stoppedDueToRateLimit = true;
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

      if (isRouteOptimizerRateLimitMessage(readErrorMessage(error))) {
        stoppedDueToRateLimit = true;
        break;
      }
    }
  }

  const selection = selectBestCandidatePlan({
    profile,
    candidates,
    assignmentByCandidateId,
  });

  const selectionWarnings = [...expansion.expansionWarnings, ...selection.selectionWarnings];

  if (stoppedDueToRateLimit) {
    selectionWarnings.push(
      "Route Optimizer preview was rate limited. Returned partial candidate previews; wait before previewing or creating final runs again."
    );
  }

  if (candidates.length > 0 && selection.recommendedCandidateId === null && candidates.every((c) => c.status === "failed")) {
    selectionWarnings.push("No valid full candidate variants could be previewed.");
  }

  return {
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
  };
}

export async function previewCandidatePlansForAgent(
  deliveryDate: string,
  profileId?: string
): Promise<DeliveryAgentPreviewCandidatePlansResponse> {
  return previewCandidatePlansPipeline({ deliveryDate, profileId });
}

export { compareCandidateDeadline };

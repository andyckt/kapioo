import { compareCandidateDeadline } from "@/lib/agents/delivery/candidate-plans/compare-candidate-deadline";
import { generateCandidatePlansForAgent } from "@/lib/agents/delivery/candidate-plans/generate-candidate-plans";
import { previewCandidateHandoff } from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import { getDeliveryOrdersForRouting } from "@/lib/agents/delivery/get-delivery-orders-for-routing";
import { getKapiooKitchenStartLocation } from "@/lib/agents/delivery/kitchen-start-location";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidatePlanPreview,
  DeliveryAgentCandidatePreviewStatus,
  DeliveryAgentCandidateRunPreview,
  DeliveryAgentPreviewCandidatePlansResponse,
} from "@/lib/contracts/delivery-agent";
import { RouteOptimizerConfigError } from "@/lib/integrations/route-optimizer/errors";

const CANDIDATE_ROUTE_PREVIEW_NOTES =
  "These previews now include a synthetic meet-up stop and receiver start time. End stop and full route-shape repair will be added later.";

function buildRoutingStopMap(stops: RoutingStop[]): Map<string, RoutingStop> {
  return new Map(stops.map((stop) => [stop.orderId, stop]));
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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

async function previewCandidatePlan(input: {
  deliveryDate: string;
  candidate: Awaited<
    ReturnType<typeof generateCandidatePlansForAgent>
  >["candidates"][number];
  kitchenAddress: string;
  profile: ReturnType<typeof getDeliveryPlanningProfile>;
  routingStopByOrderId: Map<string, RoutingStop>;
}): Promise<DeliveryAgentCandidatePlanPreview> {
  const handoffResult = await previewCandidateHandoff({
    deliveryDate: input.deliveryDate,
    candidate: input.candidate,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
  });

  const summary = compareCandidateDeadline({
    deliveryDate: input.deliveryDate,
    profile: input.profile,
    runPreviews: handoffResult.runPreviews,
    planSummary: {
      runCount: input.candidate.summary.runCount,
      totalStops: input.candidate.summary.totalStops,
      selfUsed: input.candidate.summary.selfUsed,
      selfStopCount: input.candidate.summary.selfStopCount,
    },
  });

  const warnings = [...input.candidate.warnings, ...summary.blockingIssues];

  return {
    candidateId: input.candidate.candidateId,
    name: input.candidate.name,
    strategyType: input.candidate.strategyType,
    status: resolveCandidatePreviewStatus(handoffResult.runPreviews),
    runs: handoffResult.runPreviews,
    summary,
    handoffPlan: handoffResult.handoffPlan,
    warnings,
    errors: collectCandidatePreviewErrors(handoffResult.runPreviews),
    assumptions: handoffResult.assumptions,
  };
}

export async function previewCandidatePlansForAgent(
  deliveryDate: string,
  profileId?: string
): Promise<DeliveryAgentPreviewCandidatePlansResponse> {
  const profile = getDeliveryPlanningProfile(profileId);
  const kitchenAddress = getKapiooKitchenStartLocation();
  const generation = await generateCandidatePlansForAgent(deliveryDate, profileId);

  const routing = await getDeliveryOrdersForRouting({
    deliveryDate,
    statuses: ["confirmed"],
  });
  const routingStopByOrderId = buildRoutingStopMap(routing.stops);

  const candidates: DeliveryAgentCandidatePlanPreview[] = [];

  for (const candidate of generation.candidates) {
    try {
      const preview = await previewCandidatePlan({
        deliveryDate,
        candidate,
        kitchenAddress,
        profile,
        routingStopByOrderId,
      });
      candidates.push(preview);
    } catch (error) {
      if (error instanceof RouteOptimizerConfigError) {
        throw error;
      }

      const failedRuns = candidate.runs.map((run) =>
        buildFailedRunPreview(
          run.runSlot,
          run.driverName,
          run.role,
          run.stopCount,
          readErrorMessage(error)
        )
      );

      const summary = compareCandidateDeadline({
        deliveryDate,
        profile,
        runPreviews: failedRuns,
        planSummary: {
          runCount: candidate.summary.runCount,
          totalStops: candidate.summary.totalStops,
          selfUsed: candidate.summary.selfUsed,
          selfStopCount: candidate.summary.selfStopCount,
        },
      });

      candidates.push({
        candidateId: candidate.candidateId,
        name: candidate.name,
        strategyType: candidate.strategyType,
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
        warnings: [...candidate.warnings, ...summary.blockingIssues],
        errors: [readErrorMessage(error)],
        assumptions: candidate.assumptions,
      });
    }
  }

  return {
    deliveryDate: generation.deliveryDate,
    profileId: generation.profileId,
    profileVersion: generation.profileVersion,
    candidates,
    notes: CANDIDATE_ROUTE_PREVIEW_NOTES,
  };
}

export { compareCandidateDeadline };

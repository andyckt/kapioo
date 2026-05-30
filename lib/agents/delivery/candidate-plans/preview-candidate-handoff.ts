import {
  buildCandidateRunPreviewPayload,
  buildDtHandoffPreviewPayload,
  buildMarcoHandoffPreviewPayload,
  getCandidateRunPreviewAssumptions,
} from "@/lib/agents/delivery/candidate-plans/build-candidate-run-preview-payload";
import { buildSyntheticMeetupStop } from "@/lib/agents/delivery/candidate-plans/build-synthetic-meetup-stop";
import { extractMeetupEtaFromPreview } from "@/lib/agents/delivery/candidate-plans/extract-meetup-eta";
import { selectMeetupPoint } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
import { mapRouteOptimizerPreviewResult } from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import { formatTorontoLocalTimeForRouteOptimizer } from "@/lib/agents/delivery/route-preview-time";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidateHandoffPreviewPlan,
  DeliveryAgentCandidatePlan,
  DeliveryAgentCandidateRun,
  DeliveryAgentCandidateRunPreview,
  DeliveryAgentSelectedMeetup,
} from "@/lib/contracts/delivery-agent";
import { formatDateTime } from "@/lib/format";
import { previewRouteOptimizerRun } from "@/lib/integrations/route-optimizer/client";
import { RouteOptimizerConfigError } from "@/lib/integrations/route-optimizer/errors";
import type { RouteOptimizerRunResult } from "@/lib/integrations/route-optimizer/types";

export type CandidateHandoffPreviewResult = {
  runPreviews: DeliveryAgentCandidateRunPreview[];
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  assumptions: string[];
};

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildSkippedRunPreview(run: DeliveryAgentCandidateRun): DeliveryAgentCandidateRunPreview {
  return {
    runSlot: run.runSlot,
    driverName: run.driverName,
    role: run.role,
    stopCount: run.stopCount,
    optimizedStopCount: 0,
    optimizedStops: [],
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "skipped_no_stops",
  };
}

function buildFailedRunPreview(
  run: DeliveryAgentCandidateRun,
  previewError: string
): DeliveryAgentCandidateRunPreview {
  return {
    runSlot: run.runSlot,
    driverName: run.driverName,
    role: run.role,
    stopCount: run.stopCount,
    optimizedStopCount: 0,
    optimizedStops: [],
    routeOptimizerWarnings: [],
    routeOptimizerValidationErrors: [],
    geocodeFailures: [],
    previewStatus: "failed",
    previewError,
  };
}

function buildRunPreviewFromResult(input: {
  run: DeliveryAgentCandidateRun;
  deliveryDate: string;
  startTime: string;
  routeResult: RouteOptimizerRunResult;
  meetupFields?: {
    syntheticMeetupIncluded?: boolean;
    meetupSequence?: number;
    meetupEta?: string;
    formattedMeetupEta?: string;
  };
}): DeliveryAgentCandidateRunPreview {
  const mapped = mapRouteOptimizerPreviewResult(input.routeResult, {
    deliveryDate: input.deliveryDate,
    startTime: input.startTime,
  });

  return {
    runSlot: input.run.runSlot,
    driverName: input.run.driverName,
    role: input.run.role,
    stopCount: input.run.stopCount,
    totalDurationMinutes: mapped.totalDurationMinutes,
    totalDistanceKm: mapped.totalDistanceKm,
    estimatedFinishTime: mapped.estimatedFinishTime,
    formattedEstimatedFinishTime: mapped.estimatedFinishTime
      ? formatDateTime(mapped.estimatedFinishTime)
      : undefined,
    optimizedStopCount: mapped.stopCount,
    optimizedStops: mapped.optimizedStops,
    routeOptimizerWarnings: mapped.warnings,
    routeOptimizerValidationErrors: mapped.validationErrors,
    geocodeFailures: mapped.geocodeFailures,
    previewStatus: "previewed",
    syntheticMeetupIncluded: input.meetupFields?.syntheticMeetupIncluded,
    meetupSequence: input.meetupFields?.meetupSequence,
    meetupEta: input.meetupFields?.meetupEta,
    formattedMeetupEta: input.meetupFields?.formattedMeetupEta,
  };
}

async function previewKitchenRun(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  run: DeliveryAgentCandidateRun;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
}): Promise<DeliveryAgentCandidateRunPreview> {
  if (input.run.stopCount === 0) {
    return buildSkippedRunPreview(input.run);
  }

  try {
    const startTime = input.profile.timeRules.normalKitchenStartTime;
    const payload = buildCandidateRunPreviewPayload({
      deliveryDate: input.deliveryDate,
      candidateId: input.candidate.candidateId,
      run: input.run,
      kitchenAddress: input.kitchenAddress,
      profile: input.profile,
      routingStopByOrderId: input.routingStopByOrderId,
    });
    const routeResult = await previewRouteOptimizerRun(payload);

    return buildRunPreviewFromResult({
      run: input.run,
      deliveryDate: input.deliveryDate,
      startTime,
      routeResult,
    });
  } catch (error) {
    if (error instanceof RouteOptimizerConfigError) {
      throw error;
    }

    return buildFailedRunPreview(input.run, readErrorMessage(error));
  }
}

function buildSelectedMeetup(
  selection: Extract<ReturnType<typeof selectMeetupPoint>, { handoffSkipped: false }>
): DeliveryAgentSelectedMeetup {
  return {
    meetupAddress: selection.meetupAddress,
    meetupFixedStopPosition: selection.meetupFixedStopPosition,
    variant: selection.variant,
    sourceOrderId: selection.sourceOrderId,
    sourceArea: selection.sourceArea,
    stopBeforeMeetupOrderId: selection.stopBeforeMeetupOrderId,
    syntheticHandoffStopUsed: true,
  };
}

function buildSkippedHandoffPlan(input: {
  profile: DeliveryPlanningProfile;
  skipReason: string;
}): DeliveryAgentCandidateHandoffPreviewPlan {
  return {
    providerRunSlot: input.profile.handoffRules.providerRunSlot,
    receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
    selectedMeetup: null,
    handoffSkipped: true,
    skipReason: input.skipReason,
  };
}

export async function previewCandidateHandoff(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
}): Promise<CandidateHandoffPreviewResult> {
  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const runB = input.candidate.runs.find((run) => run.runSlot === "B");
  const runC = input.candidate.runs.find((run) => run.runSlot === "C");
  const runPreviews: DeliveryAgentCandidateRunPreview[] = [];
  const assumptions = [...input.candidate.assumptions];

  const selection = selectMeetupPoint({
    runs: input.candidate.runs,
    profile: input.profile,
  });

  if (selection.handoffSkipped || !runA || !runB) {
    if (selection.handoffSkipped) {
      const skippedAssumptions = getCandidateRunPreviewAssumptions(
        { runSlot: "B", driverName: runB?.driverName ?? "Marco", stops: runB?.stops ?? [] },
        { handoffSkippedReason: selection.skipReason }
      );
      assumptions.push(...skippedAssumptions);
    }

    if (runA) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: runA,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        })
      );
    }

    if (runB) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: runB,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        })
      );
    }

    if (runC) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: runC,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
        })
      );
    }

    return {
      runPreviews,
      handoffPlan: buildSkippedHandoffPlan({
        profile: input.profile,
        skipReason: selection.handoffSkipped
          ? selection.skipReason
          : "Handoff preview requires both DT and Marco runs.",
      }),
      assumptions: [...new Set(assumptions.filter(Boolean))],
    };
  }

  const syntheticMeetupStop = buildSyntheticMeetupStop({
    profile: input.profile,
    selection,
  });
  const dtStartTime = input.profile.timeRules.normalKitchenStartTime;
  let dtPreview: DeliveryAgentCandidateRunPreview | undefined;

  try {
    const dtPayload = buildDtHandoffPreviewPayload({
      deliveryDate: input.deliveryDate,
      candidateId: input.candidate.candidateId,
      run: runA,
      kitchenAddress: input.kitchenAddress,
      profile: input.profile,
      routingStopByOrderId: input.routingStopByOrderId,
      syntheticMeetupStop,
      stopBeforeMeetupOrderId: selection.stopBeforeMeetupOrderId,
    });
    const dtRouteResult = await previewRouteOptimizerRun(dtPayload);
    const meetupExtraction = extractMeetupEtaFromPreview({
      optimizedStops: mapRouteOptimizerPreviewResult(dtRouteResult, {
        deliveryDate: input.deliveryDate,
        startTime: dtStartTime,
      }).optimizedStops,
      routeResult: dtRouteResult,
      meetupName: input.profile.handoffRules.syntheticMeetupStopName,
      expectedSequence: selection.meetupFixedStopPosition,
    });

    dtPreview = buildRunPreviewFromResult({
      run: runA,
      deliveryDate: input.deliveryDate,
      startTime: dtStartTime,
      routeResult: dtRouteResult,
      meetupFields: {
        syntheticMeetupIncluded: true,
        meetupSequence: meetupExtraction.meetupSequence ?? selection.meetupFixedStopPosition,
        meetupEta: meetupExtraction.meetupEta,
        formattedMeetupEta: meetupExtraction.meetupEta
          ? formatDateTime(meetupExtraction.meetupEta)
          : undefined,
      },
    });

    runPreviews.push(dtPreview);

    if (!meetupExtraction.meetupEta) {
      runPreviews.push(
        buildFailedRunPreview(
          runB,
          "DT preview did not return a meet-up ETA for the synthetic handoff stop."
        )
      );
    } else {
      const receiverStartTime = formatTorontoLocalTimeForRouteOptimizer(meetupExtraction.meetupEta);

      try {
        const marcoPayload = buildMarcoHandoffPreviewPayload({
          deliveryDate: input.deliveryDate,
          candidateId: input.candidate.candidateId,
          run: runB,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
          meetupAddress: selection.meetupAddress,
          meetupStartTime: receiverStartTime,
        });
        const marcoRouteResult = await previewRouteOptimizerRun(marcoPayload);

        runPreviews.push(
          buildRunPreviewFromResult({
            run: runB,
            deliveryDate: input.deliveryDate,
            startTime: receiverStartTime,
            routeResult: marcoRouteResult,
          })
        );

        if (runC) {
          runPreviews.push(
            await previewKitchenRun({
              deliveryDate: input.deliveryDate,
              candidate: input.candidate,
              run: runC,
              kitchenAddress: input.kitchenAddress,
              profile: input.profile,
              routingStopByOrderId: input.routingStopByOrderId,
            })
          );
        }

        return {
          runPreviews,
          handoffPlan: {
            providerRunSlot: input.profile.handoffRules.providerRunSlot,
            receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
            selectedMeetup: buildSelectedMeetup(selection),
            meetupEta: meetupExtraction.meetupEta,
            formattedMeetupEta: formatDateTime(meetupExtraction.meetupEta),
            receiverStartLocation: selection.meetupAddress,
            receiverStartTime,
          },
          assumptions: [...new Set(assumptions.filter(Boolean))],
        };
      } catch (error) {
        if (error instanceof RouteOptimizerConfigError) {
          throw error;
        }

        runPreviews.push(buildFailedRunPreview(runB, readErrorMessage(error)));
      }
    }
  } catch (error) {
    if (error instanceof RouteOptimizerConfigError) {
      throw error;
    }

    runPreviews.push(buildFailedRunPreview(runA, readErrorMessage(error)));
    runPreviews.push(
      buildFailedRunPreview(runB, "Marco preview skipped because DT handoff preview failed.")
    );
  }

  if (runC) {
    runPreviews.push(
      await previewKitchenRun({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        run: runC,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
      })
    );
  }

  return {
    runPreviews,
    handoffPlan: {
      providerRunSlot: input.profile.handoffRules.providerRunSlot,
      receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
      selectedMeetup: buildSelectedMeetup(selection),
      meetupEta: dtPreview?.meetupEta,
      formattedMeetupEta: dtPreview?.formattedMeetupEta,
      receiverStartLocation: selection.meetupAddress,
    },
    assumptions: [...new Set(assumptions.filter(Boolean))],
  };
}

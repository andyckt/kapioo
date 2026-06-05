import {
  buildCandidateRunPreviewPayload,
  buildDtHandoffPreviewPayload,
  buildMarcoHandoffPreviewPayload,
  getCandidateRunPreviewAssumptions,
  type CustomerConstraintsMap,
} from "@/lib/agents/delivery/candidate-plans/build-candidate-run-preview-payload";
import { buildSyntheticMeetupStop } from "@/lib/agents/delivery/candidate-plans/build-synthetic-meetup-stop";
import { resolveOperationalMeetupContactPhone } from "@/lib/agents/delivery/final-route-run/resolve-meetup-contact-phone";
import { extractMeetupEtaFromPreview } from "@/lib/agents/delivery/candidate-plans/extract-meetup-eta";
import { selectMeetupPoint, type MeetupSelectionResult } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
import { findBackupRun, findPrimaryReceiverRun, findProviderRun } from "@/lib/agents/delivery/candidate-plans/find-run-by-slot";
import { mapRouteOptimizerPreviewResult } from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import { formatTorontoLocalTimeForRouteOptimizer } from "@/lib/agents/delivery/route-preview-time";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import {
  addBudgetMetadataToPreviewPayload,
  previewBudgetExhaustedError,
  readRouteOptimizerGoogleCostEstimate,
  type DeliveryAgentPreviewBudget,
  type DeliveryAgentPreviewBudgetPhase,
} from "@/lib/agents/delivery/candidate-plans/preview-budget";
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
import type {
  RouteOptimizerPreviewRequest,
  RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";

export type CandidateHandoffPreviewResult = {
  runPreviews: DeliveryAgentCandidateRunPreview[];
  handoffPlan: DeliveryAgentCandidateHandoffPreviewPlan;
  assumptions: string[];
};

export type HandoffRunChainOverrides = {
  dtCustomerConstraints?: CustomerConstraintsMap;
  marcoCustomerConstraints?: CustomerConstraintsMap;
  syntheticMeetupFixedPosition?: 1 | 2;
};

export type ActiveMeetupSelection = Extract<MeetupSelectionResult, { handoffSkipped: false }>;

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function previewRouteOptimizerRunWithBudget(input: {
  payload: RouteOptimizerPreviewRequest;
  budget: DeliveryAgentPreviewBudget;
  candidateId: string;
  runSlot: string;
  phase: DeliveryAgentPreviewBudgetPhase;
  label: string;
}): Promise<RouteOptimizerRunResult> {
  const consume = input.budget.consume({
    candidateId: input.candidateId,
    runSlot: input.runSlot,
    phase: input.phase,
    label: input.label,
  });

  if (!consume.allowed) {
    throw previewBudgetExhaustedError(consume.message);
  }

  let routeResult: RouteOptimizerRunResult;
  try {
    routeResult = await previewRouteOptimizerRun(
      addBudgetMetadataToPreviewPayload({
        payload: input.payload,
        budget: input.budget,
        consume,
      })
    );
  } catch (error) {
    const errorBody =
      error && typeof error === "object" ? (error as { body?: unknown }).body : undefined;
    const errorEstimate =
      errorBody && typeof errorBody === "object"
        ? (errorBody as Record<string, unknown>).google_cost_estimate
        : undefined;
    input.budget.recordRouteOptimizerGoogleCostEstimate({
      estimate: readRouteOptimizerGoogleCostEstimate(errorEstimate),
      candidateId: input.candidateId,
      runSlot: input.runSlot,
      phase: input.phase,
      callIndex: consume.callIndex,
    });
    throw error;
  }
  input.budget.recordRouteOptimizerGoogleCostEstimate({
    estimate: routeResult.google_cost_estimate,
    candidateId: input.candidateId,
    runSlot: input.runSlot,
    phase: input.phase,
    callIndex: consume.callIndex,
  });

  return routeResult;
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
    routeOptimizerGoogleCostEstimate: input.routeResult.google_cost_estimate,
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
  customerConstraints?: CustomerConstraintsMap;
  budget: DeliveryAgentPreviewBudget;
  budgetPhase?: DeliveryAgentPreviewBudgetPhase;
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
      customerConstraints: input.customerConstraints,
    });
    const routeResult = await previewRouteOptimizerRunWithBudget({
      payload,
      budget: input.budget,
      candidateId: input.candidate.candidateId,
      runSlot: input.run.runSlot,
      phase: input.budgetPhase ?? "initial",
      label: `candidate ${input.candidate.candidateId} run ${input.run.runSlot}`,
    });

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
    score: selection.score,
    scoreBreakdown: selection.scoreBreakdown,
    reasoning: selection.reasoning,
    warnings: selection.warnings,
    selectionConfidence: selection.selectionConfidence,
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

export async function previewMarcoHandoffRunOnly(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  runB: DeliveryAgentCandidateRun;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  meetupAddress: string;
  meetupStartTime: string;
  customerConstraints?: CustomerConstraintsMap;
  budget: DeliveryAgentPreviewBudget;
  budgetPhase?: DeliveryAgentPreviewBudgetPhase;
}): Promise<DeliveryAgentCandidateRunPreview> {
  try {
    const marcoPayload = buildMarcoHandoffPreviewPayload({
      deliveryDate: input.deliveryDate,
      candidateId: input.candidate.candidateId,
      run: input.runB,
      profile: input.profile,
      routingStopByOrderId: input.routingStopByOrderId,
      meetupAddress: input.meetupAddress,
      meetupStartTime: input.meetupStartTime,
      customerConstraints: input.customerConstraints,
    });
    const marcoRouteResult = await previewRouteOptimizerRunWithBudget({
      payload: marcoPayload,
      budget: input.budget,
      candidateId: input.candidate.candidateId,
      runSlot: input.runB.runSlot,
      phase: input.budgetPhase ?? "initial",
      label: `candidate ${input.candidate.candidateId} receiver handoff run ${input.runB.runSlot}`,
    });

    return buildRunPreviewFromResult({
      run: input.runB,
      deliveryDate: input.deliveryDate,
      startTime: input.meetupStartTime,
      routeResult: marcoRouteResult,
    });
  } catch (error) {
    if (error instanceof RouteOptimizerConfigError) {
      throw error;
    }

    return buildFailedRunPreview(input.runB, readErrorMessage(error));
  }
}

export async function previewHandoffRunChain(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  runA: DeliveryAgentCandidateRun;
  runB: DeliveryAgentCandidateRun;
  runC?: DeliveryAgentCandidateRun;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  selection: ActiveMeetupSelection;
  overrides?: HandoffRunChainOverrides;
  assumptions?: string[];
  budget: DeliveryAgentPreviewBudget;
  budgetPhase?: DeliveryAgentPreviewBudgetPhase;
}): Promise<CandidateHandoffPreviewResult> {
  const runPreviews: DeliveryAgentCandidateRunPreview[] = [];
  const assumptions = [...(input.assumptions ?? input.candidate.assumptions)];

  let syntheticMeetupStop = buildSyntheticMeetupStop({
    profile: input.profile,
    selection: input.selection,
    deliveryDate: input.deliveryDate,
    runSlot: input.runA.runSlot,
    contactPhone: resolveOperationalMeetupContactPhone({ profile: input.profile }),
  });

  if (input.overrides?.syntheticMeetupFixedPosition !== undefined) {
    syntheticMeetupStop = {
      ...syntheticMeetupStop,
      fixed_stop_position: input.overrides.syntheticMeetupFixedPosition,
    };
  }

  const dtStartTime = input.profile.timeRules.normalKitchenStartTime;
  let dtPreview: DeliveryAgentCandidateRunPreview | undefined;

  try {
    const dtPayload = buildDtHandoffPreviewPayload({
      deliveryDate: input.deliveryDate,
      candidateId: input.candidate.candidateId,
      run: input.runA,
      kitchenAddress: input.kitchenAddress,
      profile: input.profile,
      routingStopByOrderId: input.routingStopByOrderId,
      syntheticMeetupStop,
      stopBeforeMeetupOrderId: input.selection.stopBeforeMeetupOrderId,
      customerConstraints: input.overrides?.dtCustomerConstraints,
    });
    const budgetPhase = input.budgetPhase ?? "initial";
    const dtRouteResult = await previewRouteOptimizerRunWithBudget({
      payload: dtPayload,
      budget: input.budget,
      candidateId: input.candidate.candidateId,
      runSlot: input.runA.runSlot,
      phase: budgetPhase,
      label: `candidate ${input.candidate.candidateId} provider handoff run ${input.runA.runSlot}`,
    });
    const meetupExtraction = extractMeetupEtaFromPreview({
      optimizedStops: mapRouteOptimizerPreviewResult(dtRouteResult, {
        deliveryDate: input.deliveryDate,
        startTime: dtStartTime,
      }).optimizedStops,
      routeResult: dtRouteResult,
      meetupName: input.profile.handoffRules.syntheticMeetupStopName,
      expectedSequence:
        input.overrides?.syntheticMeetupFixedPosition ?? input.selection.meetupFixedStopPosition,
    });

    dtPreview = buildRunPreviewFromResult({
      run: input.runA,
      deliveryDate: input.deliveryDate,
      startTime: dtStartTime,
      routeResult: dtRouteResult,
      meetupFields: {
        syntheticMeetupIncluded: true,
        meetupSequence: meetupExtraction.meetupSequence ?? input.selection.meetupFixedStopPosition,
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
          input.runB,
          "DT preview did not return a meet-up ETA for the synthetic handoff stop."
        )
      );
    } else {
      const receiverStartTime = formatTorontoLocalTimeForRouteOptimizer(meetupExtraction.meetupEta);

      const marcoPreview = await previewMarcoHandoffRunOnly({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        runB: input.runB,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        meetupAddress: input.selection.meetupAddress,
        meetupStartTime: receiverStartTime,
        customerConstraints: input.overrides?.marcoCustomerConstraints,
        budget: input.budget,
        budgetPhase,
      });

      runPreviews.push(marcoPreview);

      if (input.runC) {
        runPreviews.push(
          await previewKitchenRun({
            deliveryDate: input.deliveryDate,
            candidate: input.candidate,
            run: input.runC,
            kitchenAddress: input.kitchenAddress,
            profile: input.profile,
            routingStopByOrderId: input.routingStopByOrderId,
            budget: input.budget,
            budgetPhase,
          })
        );
      }

      if (marcoPreview.previewStatus === "previewed") {
        return {
          runPreviews,
          handoffPlan: {
            providerRunSlot: input.profile.handoffRules.providerRunSlot,
            receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
            selectedMeetup: buildSelectedMeetup(input.selection),
            meetupEta: meetupExtraction.meetupEta,
            formattedMeetupEta: formatDateTime(meetupExtraction.meetupEta),
            receiverStartLocation: input.selection.meetupAddress,
            receiverStartTime,
          },
          assumptions: [...new Set(assumptions.filter(Boolean))],
        };
      }
    }
  } catch (error) {
    if (error instanceof RouteOptimizerConfigError) {
      throw error;
    }

    runPreviews.push(buildFailedRunPreview(input.runA, readErrorMessage(error)));
    runPreviews.push(
      buildFailedRunPreview(input.runB, "Marco preview skipped because DT handoff preview failed.")
    );
  }

  if (input.runC) {
    runPreviews.push(
      await previewKitchenRun({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        run: input.runC,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        budget: input.budget,
        budgetPhase: input.budgetPhase ?? "initial",
      })
    );
  }

  return {
    runPreviews,
    handoffPlan: {
      providerRunSlot: input.profile.handoffRules.providerRunSlot,
      receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
      selectedMeetup: buildSelectedMeetup(input.selection),
      meetupEta: dtPreview?.meetupEta,
      formattedMeetupEta: dtPreview?.formattedMeetupEta,
      receiverStartLocation: input.selection.meetupAddress,
    },
    assumptions: [...new Set(assumptions.filter(Boolean))],
  };
}

export async function previewKitchenRunWithConstraints(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  run: DeliveryAgentCandidateRun;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  customerConstraints?: CustomerConstraintsMap;
  budget: DeliveryAgentPreviewBudget;
  budgetPhase?: DeliveryAgentPreviewBudgetPhase;
}): Promise<DeliveryAgentCandidateRunPreview> {
  return previewKitchenRun(input);
}

export async function previewCandidateHandoff(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  meetupSelection?: ActiveMeetupSelection;
  handoffOverrides?: HandoffRunChainOverrides;
  budget: DeliveryAgentPreviewBudget;
}): Promise<CandidateHandoffPreviewResult> {
  const providerRun = findProviderRun(input.candidate.runs, input.profile);
  const receiverRun = findPrimaryReceiverRun(input.candidate.runs, input.profile);
  const backupRun = findBackupRun(input.candidate.runs);
  const runPreviews: DeliveryAgentCandidateRunPreview[] = [];
  const assumptions = [...input.candidate.assumptions];

  const selection: MeetupSelectionResult =
    input.meetupSelection ??
    selectMeetupPoint({
      runs: input.candidate.runs,
      profile: input.profile,
    });

  if (selection.handoffSkipped || !providerRun || !receiverRun) {
    if (selection.handoffSkipped) {
      const skippedAssumptions = getCandidateRunPreviewAssumptions(
        {
          runSlot: receiverRun?.runSlot ?? input.profile.handoffRules.receiverRunSlots[0] ?? "B",
          driverName: receiverRun?.driverName ?? "Receiver",
          stops: receiverRun?.stops ?? [],
        },
        { handoffSkippedReason: selection.skipReason }
      );
      assumptions.push(...skippedAssumptions);
    }

    if (providerRun) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: providerRun,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
          budget: input.budget,
        })
      );
    }

    if (receiverRun) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: receiverRun,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
          budget: input.budget,
        })
      );
    }

    if (backupRun) {
      runPreviews.push(
        await previewKitchenRun({
          deliveryDate: input.deliveryDate,
          candidate: input.candidate,
          run: backupRun,
          kitchenAddress: input.kitchenAddress,
          profile: input.profile,
          routingStopByOrderId: input.routingStopByOrderId,
          budget: input.budget,
        })
      );
    }

    return {
      runPreviews,
      handoffPlan: buildSkippedHandoffPlan({
        profile: input.profile,
        skipReason: selection.handoffSkipped
          ? selection.skipReason
          : "Handoff preview requires both provider and receiver runs.",
      }),
      assumptions: [...new Set(assumptions.filter(Boolean))],
    };
  }

  return previewHandoffRunChain({
    deliveryDate: input.deliveryDate,
    candidate: input.candidate,
    runA: providerRun,
    runB: receiverRun,
    runC: backupRun,
    kitchenAddress: input.kitchenAddress,
    profile: input.profile,
    routingStopByOrderId: input.routingStopByOrderId,
    selection,
    assumptions,
    overrides: input.handoffOverrides,
    budget: input.budget,
  });
}

import { compareCandidateDeadline } from "@/lib/agents/delivery/candidate-plans/compare-candidate-deadline";
import { detectRouteShapeIssues } from "@/lib/agents/delivery/candidate-plans/detect-route-shape-issues";
import { planRouteShapeRepairs } from "@/lib/agents/delivery/candidate-plans/plan-route-shape-repairs";
import {
  type CandidateHandoffPreviewResult,
  previewHandoffRunChain,
  previewKitchenRunWithConstraints,
  previewMarcoHandoffRunOnly,
  type ActiveMeetupSelection,
} from "@/lib/agents/delivery/candidate-plans/preview-candidate-handoff";
import { selectMeetupPoint } from "@/lib/agents/delivery/candidate-plans/select-meetup-point";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidatePlan,
  DeliveryAgentCandidateRepairSummary,
  DeliveryAgentCandidateRunPreview,
  DeliveryAgentRepairActionApplied,
  DeliveryAgentRouteShapeIssuePreview,
} from "@/lib/contracts/delivery-agent";
import { RouteOptimizerConfigError } from "@/lib/integrations/route-optimizer/errors";

export type CandidateRouteRepairResult = CandidateHandoffPreviewResult & {
  candidateRepairSummary: DeliveryAgentCandidateRepairSummary;
};

function buildEmptyRepairSummary(
  issues: DeliveryAgentRouteShapeIssuePreview[] = []
): DeliveryAgentCandidateRepairSummary {
  return {
    repairAttempted: false,
    repairSucceeded: false,
    issuesDetected: issues,
    repairActionsApplied: [],
    warnings: [],
  };
}

function annotateRunPreviews(input: {
  runPreviews: DeliveryAgentCandidateRunPreview[];
  issues: DeliveryAgentRouteShapeIssuePreview[];
  actions: DeliveryAgentRepairActionApplied[];
  repairStatus: "not_needed" | "repaired" | "repair_failed";
  wasRepreviewedAfterRepair: boolean;
}): DeliveryAgentCandidateRunPreview[] {
  return input.runPreviews.map((run) => ({
    ...run,
    routeShapeIssues: input.issues.filter((issue) => issue.runSlot === run.runSlot),
    repairActionsApplied: input.actions.filter((action) => action.runSlot === run.runSlot),
    wasRepreviewedAfterRepair: input.wasRepreviewedAfterRepair,
    repairStatus: input.repairStatus,
  }));
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function repreviewSkippedHandoffRuns(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  originalPreviews: DeliveryAgentCandidateRunPreview[];
  repairPlan: ReturnType<typeof planRouteShapeRepairs>;
}): Promise<CandidateHandoffPreviewResult> {
  const runPreviews: DeliveryAgentCandidateRunPreview[] = [];

  for (const run of input.candidate.runs) {
    const original = input.originalPreviews.find((preview) => preview.runSlot === run.runSlot);
    const constraints =
      run.runSlot === "A"
        ? input.repairPlan.dtCustomerConstraints
        : run.runSlot === "B"
          ? input.repairPlan.marcoCustomerConstraints
          : undefined;

    const needsRepreview =
      (run.runSlot === "A" && input.repairPlan.requiresDtRepreview) ||
      (run.runSlot === "B" && input.repairPlan.requiresMarcoRepreview);

    if (!needsRepreview || !constraints || constraints.size === 0) {
      if (original) {
        runPreviews.push(original);
      }
      continue;
    }

    if (run.stopCount === 0) {
      runPreviews.push({
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
      });
      continue;
    }

    runPreviews.push(
      await previewKitchenRunWithConstraints({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        run,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        customerConstraints: constraints,
      })
    );
  }

  return {
    runPreviews,
    handoffPlan: {
      providerRunSlot: input.profile.handoffRules.providerRunSlot,
      receiverRunSlot: input.profile.handoffRules.receiverRunSlots[0] ?? "B",
      selectedMeetup: null,
      handoffSkipped: true,
      skipReason: "Handoff skipped; route repair applied on kitchen-start previews.",
    },
    assumptions: input.candidate.assumptions,
  };
}

export async function repairCandidateRoutePreview(input: {
  deliveryDate: string;
  candidate: DeliveryAgentCandidatePlan;
  kitchenAddress: string;
  profile: DeliveryPlanningProfile;
  routingStopByOrderId: Map<string, RoutingStop>;
  handoffResult: CandidateHandoffPreviewResult;
  planSummary: {
    runCount: number;
    totalStops: number;
    selfUsed: boolean;
    selfStopCount: number;
  };
}): Promise<CandidateRouteRepairResult> {
  const issues = detectRouteShapeIssues({
    candidate: input.candidate,
    runPreviews: input.handoffResult.runPreviews,
    profile: input.profile,
    handoffPlan: input.handoffResult.handoffPlan,
    routingStopByOrderId: input.routingStopByOrderId,
  });

  if (issues.length === 0) {
    return {
      ...input.handoffResult,
      runPreviews: annotateRunPreviews({
        runPreviews: input.handoffResult.runPreviews,
        issues: [],
        actions: [],
        repairStatus: "not_needed",
        wasRepreviewedAfterRepair: false,
      }),
      candidateRepairSummary: buildEmptyRepairSummary([]),
    };
  }

  const beforeSummary = compareCandidateDeadline({
    deliveryDate: input.deliveryDate,
    profile: input.profile,
    runPreviews: input.handoffResult.runPreviews,
    planSummary: input.planSummary,
  });

  const repairPlan = planRouteShapeRepairs({
    issues,
    candidate: input.candidate,
    profile: input.profile,
    handoffPlan: input.handoffResult.handoffPlan,
    routingStopByOrderId: input.routingStopByOrderId,
  });

  if (repairPlan.actions.length === 0) {
    return {
      ...input.handoffResult,
      runPreviews: annotateRunPreviews({
        runPreviews: input.handoffResult.runPreviews,
        issues,
        actions: [],
        repairStatus: "not_needed",
        wasRepreviewedAfterRepair: false,
      }),
      candidateRepairSummary: {
        repairAttempted: true,
        repairSucceeded: false,
        issuesDetected: issues,
        repairActionsApplied: [],
        beforeSummary,
        warnings: repairPlan.warnings.length
          ? repairPlan.warnings
          : ["Issues detected but no repair actions could be planned."],
      },
    };
  }

  try {
    let repairedResult: CandidateHandoffPreviewResult;

    if (input.handoffResult.handoffPlan.handoffSkipped) {
      repairedResult = await repreviewSkippedHandoffRuns({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        originalPreviews: input.handoffResult.runPreviews,
        repairPlan,
      });
    } else if (repairPlan.requiresDtRepreview) {
      const runA = input.candidate.runs.find((run) => run.runSlot === "A");
      const runB = input.candidate.runs.find((run) => run.runSlot === "B");
      const runC = input.candidate.runs.find((run) => run.runSlot === "C");
      const selection = selectMeetupPoint({
        runs: input.candidate.runs,
        profile: input.profile,
      });

      if (selection.handoffSkipped || !runA || !runB) {
        throw new Error("Cannot re-preview handoff repair without active meet-up selection.");
      }

      repairedResult = await previewHandoffRunChain({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        runA,
        runB,
        runC,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        selection: selection as ActiveMeetupSelection,
        overrides: {
          dtCustomerConstraints: repairPlan.dtCustomerConstraints,
          marcoCustomerConstraints: repairPlan.marcoCustomerConstraints,
          syntheticMeetupFixedPosition: repairPlan.syntheticMeetupFixedPosition,
        },
        assumptions: input.handoffResult.assumptions,
      });
    } else if (repairPlan.requiresMarcoRepreview) {
      const runB = input.candidate.runs.find((run) => run.runSlot === "B");
      const dtPreview = input.handoffResult.runPreviews.find((run) => run.runSlot === "A");
      const handoffPlan = input.handoffResult.handoffPlan;

      if (!runB || !handoffPlan.receiverStartTime || !handoffPlan.receiverStartLocation) {
        throw new Error("Cannot re-preview Marco repair without handoff start details.");
      }

      const marcoPreview = await previewMarcoHandoffRunOnly({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        runB,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        meetupAddress: handoffPlan.receiverStartLocation,
        meetupStartTime: handoffPlan.receiverStartTime,
        customerConstraints: repairPlan.marcoCustomerConstraints,
      });

      repairedResult = {
        runPreviews: input.handoffResult.runPreviews.map((run) =>
          run.runSlot === "B" ? marcoPreview : run
        ),
        handoffPlan: input.handoffResult.handoffPlan,
        assumptions: input.handoffResult.assumptions,
      };

      if (dtPreview) {
        void dtPreview;
      }
    } else {
      repairedResult = input.handoffResult;
    }

    const repreviewFailed = repairedResult.runPreviews.some((run) => {
      if (repairPlan.requiresDtRepreview && run.runSlot === "A") {
        return run.previewStatus === "failed";
      }

      if (repairPlan.requiresMarcoRepreview && run.runSlot === "B") {
        return run.previewStatus === "failed";
      }

      return false;
    });

    if (repreviewFailed) {
      const failureReason =
        repairedResult.runPreviews.find((run) => run.previewStatus === "failed")?.previewError ??
        "Repaired Route Optimizer preview failed.";

      return {
        ...input.handoffResult,
        runPreviews: annotateRunPreviews({
          runPreviews: input.handoffResult.runPreviews,
          issues,
          actions: repairPlan.actions,
          repairStatus: "repair_failed",
          wasRepreviewedAfterRepair: false,
        }),
        candidateRepairSummary: {
          repairAttempted: true,
          repairSucceeded: false,
          issuesDetected: issues,
          repairActionsApplied: repairPlan.actions,
          beforeSummary,
          warnings: [failureReason, ...repairPlan.warnings],
        },
      };
    }

    const afterSummary = compareCandidateDeadline({
      deliveryDate: input.deliveryDate,
      profile: input.profile,
      runPreviews: repairedResult.runPreviews,
      planSummary: input.planSummary,
    });

    return {
      runPreviews: annotateRunPreviews({
        runPreviews: repairedResult.runPreviews,
        issues,
        actions: repairPlan.actions,
        repairStatus: "repaired",
        wasRepreviewedAfterRepair: true,
      }),
      handoffPlan: repairedResult.handoffPlan,
      assumptions: repairedResult.assumptions,
      candidateRepairSummary: {
        repairAttempted: true,
        repairSucceeded: true,
        issuesDetected: issues,
        repairActionsApplied: repairPlan.actions,
        beforeSummary,
        afterSummary,
        warnings: repairPlan.warnings,
      },
    };
  } catch (error) {
    if (error instanceof RouteOptimizerConfigError) {
      throw error;
    }

    return {
      ...input.handoffResult,
      runPreviews: annotateRunPreviews({
        runPreviews: input.handoffResult.runPreviews,
        issues,
        actions: repairPlan.actions,
        repairStatus: "repair_failed",
        wasRepreviewedAfterRepair: false,
      }),
      candidateRepairSummary: {
        repairAttempted: true,
        repairSucceeded: false,
        issuesDetected: issues,
        repairActionsApplied: repairPlan.actions,
        beforeSummary,
        warnings: [readErrorMessage(error), ...repairPlan.warnings],
      },
    };
  }
}

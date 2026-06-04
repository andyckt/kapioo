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
import { findPrimaryReceiverRun, findProviderRun } from "@/lib/agents/delivery/candidate-plans/find-run-by-slot";
import { rebuildMeetupSelectionFromSelectedMeetup } from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import type { DeliveryAgentPreviewBudget } from "@/lib/agents/delivery/candidate-plans/preview-budget";
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
  budget: DeliveryAgentPreviewBudget;
}): Promise<CandidateHandoffPreviewResult> {
  const providerRunSlot = input.profile.handoffRules.providerRunSlot;
  const receiverRunSlot = input.profile.handoffRules.receiverRunSlots[0] ?? "B";
  const runPreviews: DeliveryAgentCandidateRunPreview[] = [];

  for (const run of input.candidate.runs) {
    const original = input.originalPreviews.find((preview) => preview.runSlot === run.runSlot);
    const constraints =
      run.runSlot === providerRunSlot
        ? input.repairPlan.dtCustomerConstraints
        : run.runSlot === receiverRunSlot
          ? input.repairPlan.marcoCustomerConstraints
          : undefined;

    const needsRepreview =
      (run.runSlot === providerRunSlot && input.repairPlan.requiresDtRepreview) ||
      (run.runSlot === receiverRunSlot && input.repairPlan.requiresMarcoRepreview);

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
        budget: input.budget,
        budgetPhase: "repair",
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
  budget: DeliveryAgentPreviewBudget;
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
        budget: input.budget,
      });
    } else if (repairPlan.requiresDtRepreview) {
      const providerRun = findProviderRun(input.candidate.runs, input.profile);
      const receiverRun = findPrimaryReceiverRun(input.candidate.runs, input.profile);
      const backupRun = input.candidate.runs.find((run) => run.role === "self");
      const selectedMeetup = input.handoffResult.handoffPlan.selectedMeetup;

      if (!selectedMeetup) {
        throw new Error("Cannot re-preview handoff repair without locked meet-up selection.");
      }

      const selection = rebuildMeetupSelectionFromSelectedMeetup(selectedMeetup);

      if (!providerRun || !receiverRun) {
        throw new Error("Cannot re-preview handoff repair without active provider and receiver runs.");
      }

      repairedResult = await previewHandoffRunChain({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        runA: providerRun,
        runB: receiverRun,
        runC: backupRun,
        kitchenAddress: input.kitchenAddress,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        selection,
        overrides: {
          dtCustomerConstraints: repairPlan.dtCustomerConstraints,
          marcoCustomerConstraints: repairPlan.marcoCustomerConstraints,
          syntheticMeetupFixedPosition: repairPlan.syntheticMeetupFixedPosition,
        },
        assumptions: input.handoffResult.assumptions,
        budget: input.budget,
        budgetPhase: "repair",
      });
    } else if (repairPlan.requiresMarcoRepreview) {
      const receiverRun = findPrimaryReceiverRun(input.candidate.runs, input.profile);
      const handoffPlan = input.handoffResult.handoffPlan;

      if (!receiverRun || !handoffPlan.receiverStartTime || !handoffPlan.receiverStartLocation) {
        throw new Error("Cannot re-preview receiver repair without handoff start details.");
      }

      const receiverPreview = await previewMarcoHandoffRunOnly({
        deliveryDate: input.deliveryDate,
        candidate: input.candidate,
        runB: receiverRun,
        profile: input.profile,
        routingStopByOrderId: input.routingStopByOrderId,
        meetupAddress: handoffPlan.receiverStartLocation,
        meetupStartTime: handoffPlan.receiverStartTime,
        customerConstraints: repairPlan.marcoCustomerConstraints,
        budget: input.budget,
        budgetPhase: "repair",
      });

      repairedResult = {
        runPreviews: input.handoffResult.runPreviews.map((run) =>
          run.runSlot === receiverRun.runSlot ? receiverPreview : run
        ),
        handoffPlan: input.handoffResult.handoffPlan,
        assumptions: input.handoffResult.assumptions,
      };
    } else {
      repairedResult = input.handoffResult;
    }

    const providerRunSlot = input.profile.handoffRules.providerRunSlot;
    const receiverRunSlot = input.profile.handoffRules.receiverRunSlots[0] ?? "B";

    const repreviewFailed = repairedResult.runPreviews.some((run) => {
      if (repairPlan.requiresDtRepreview && run.runSlot === providerRunSlot) {
        return run.previewStatus === "failed";
      }

      if (repairPlan.requiresMarcoRepreview && run.runSlot === receiverRunSlot) {
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

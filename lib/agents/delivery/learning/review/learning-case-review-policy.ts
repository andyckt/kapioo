import { ApiError } from "@/lib/api";
import {
  LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT,
  LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE,
  LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT,
  assessDeliveryAgentLearningBackfillReadiness,
} from "@/lib/agents/delivery/learning/backfill/learning-backfill-readiness";
import { getDeliveryAgentLearningLabelWeight } from "@/lib/agents/delivery/learning/shared/learning-label-weight";
import type {
  DeliveryAgentLearningCaseContract,
  DeliveryAgentLearningLabel,
  DeliveryAgentLearningManualReview,
  DeliveryAgentLearningManualReviewAction,
} from "@/lib/contracts/delivery-agent-learning";
import type { DeliveryAgentLearningReviewCaseDetail } from "@/lib/contracts/delivery-agent-learning-review";

const REVIEW_ACTION_LABELS: Record<DeliveryAgentLearningManualReviewAction, string> = {
  approve_positive: "Use as strong good example",
  approve_weak_positive: "Use as weaker good example",
  mark_negative: "Use as bad result",
  mark_avoid_pattern: "Use as avoid pattern",
  exclude: "Exclude from learning",
  keep_uncertain: "Keep as uncertain",
  reset_pending: "Send back to pending",
};

const REVIEW_ACTION_DESCRIPTIONS: Record<DeliveryAgentLearningManualReviewAction, string> = {
  approve_positive: "The route worked well and can guide future recommendations strongly.",
  approve_weak_positive:
    "The route mostly worked, but should influence the agent with less confidence.",
  mark_negative: "The day had problems; the agent may study it as a bad outcome.",
  mark_avoid_pattern:
    "The split or route shape should actively be avoided in future planning.",
  exclude: "The data is too messy or not relevant enough to use for learning.",
  keep_uncertain: "Reviewed, but not trusted as a good or bad example yet.",
  reset_pending: "Move it back into the review queue for another pass.",
};

const ACTION_TO_LABEL: Record<
  DeliveryAgentLearningManualReviewAction,
  DeliveryAgentLearningLabel
> = {
  approve_positive: "positive",
  approve_weak_positive: "weak_positive",
  mark_negative: "negative",
  mark_avoid_pattern: "avoid_pattern",
  exclude: "excluded",
  keep_uncertain: "uncertain",
  reset_pending: "uncertain",
};

const ACTIONS_REQUIRING_NOTES = new Set<DeliveryAgentLearningManualReviewAction>([
  "mark_negative",
  "mark_avoid_pattern",
  "exclude",
]);

export function getDeliveryAgentLearningReviewActionLabel(
  action: DeliveryAgentLearningManualReviewAction
): string {
  return REVIEW_ACTION_LABELS[action];
}

export function isTrustedPositiveLearningLabel(label: DeliveryAgentLearningLabel): boolean {
  return label === "positive" || label === "weak_positive";
}

export function getPositiveApprovalBlockers(
  learningCase: DeliveryAgentLearningCaseContract
): string[] {
  const blockers: string[] = [];

  if (
    learningCase.matchCoverage.matchCoveragePercent <
    LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT
  ) {
    blockers.push(
      `Match coverage must be at least ${LEARNING_BACKFILL_READY_MIN_MATCH_COVERAGE_PERCENT}%.`
    );
  }

  if (
    learningCase.coordinateCoverage.coveragePercent <
    LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT
  ) {
    blockers.push(
      `Coordinate coverage must be at least ${LEARNING_BACKFILL_READY_MIN_COORDINATE_COVERAGE_PERCENT}%.`
    );
  }

  if (learningCase.quality.dataQualityScore < LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE) {
    blockers.push(
      `Data quality must be at least ${LEARNING_BACKFILL_READY_MIN_DATA_QUALITY_SCORE}.`
    );
  }

  if (learningCase.matchCoverage.matchedOrders === 0) {
    blockers.push("At least one Admin order must match a Route Optimizer stop.");
  }

  return blockers;
}

export function canUseManualReviewForPositiveRetrieval(input: {
  learningCase: DeliveryAgentLearningCaseContract;
  label: DeliveryAgentLearningLabel;
}): boolean {
  return (
    isTrustedPositiveLearningLabel(input.label) &&
    getPositiveApprovalBlockers(input.learningCase).length === 0
  );
}

export function buildLearningCaseReviewActions(
  learningCase: DeliveryAgentLearningCaseContract
): DeliveryAgentLearningReviewCaseDetail["reviewActions"] {
  const positiveBlockers = getPositiveApprovalBlockers(learningCase);

  return (Object.keys(REVIEW_ACTION_LABELS) as DeliveryAgentLearningManualReviewAction[]).map(
    (action) => {
      const isPositiveAction = action === "approve_positive" || action === "approve_weak_positive";
      const disabled = isPositiveAction && positiveBlockers.length > 0;

      return {
        action,
        label: REVIEW_ACTION_LABELS[action],
        description: REVIEW_ACTION_DESCRIPTIONS[action],
        requiresNotes: ACTIONS_REQUIRING_NOTES.has(action),
        disabled,
        disabledReason: disabled ? positiveBlockers.join(" ") : undefined,
      };
    }
  );
}

export function buildLearningCaseManualReviewPatch(input: {
  learningCase: DeliveryAgentLearningCaseContract;
  action: DeliveryAgentLearningManualReviewAction;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}): {
  reviewStatus: DeliveryAgentLearningCaseContract["reviewStatus"];
  quality: DeliveryAgentLearningCaseContract["quality"];
  manualReview: DeliveryAgentLearningManualReview | null;
} {
  const notes = input.notes?.trim() ?? "";

  if (ACTIONS_REQUIRING_NOTES.has(input.action) && notes.length < 3) {
    throw new ApiError("Please add a short reason before saving this review.", {
      status: 400,
      code: "review_notes_required",
    });
  }

  if (
    (input.action === "approve_positive" || input.action === "approve_weak_positive") &&
    getPositiveApprovalBlockers(input.learningCase).length > 0
  ) {
    throw new ApiError("This historical case is not safe enough to approve as a good example.", {
      status: 409,
      code: "positive_approval_blocked",
      details: getPositiveApprovalBlockers(input.learningCase).join(" "),
    });
  }

  const previousLearningLabel = input.learningCase.quality.learningLabel;
  const learningLabel = ACTION_TO_LABEL[input.action];
  const reviewStatus = input.action === "reset_pending" ? "pending" : "reviewed";
  const canUseForPositiveRetrieval = canUseManualReviewForPositiveRetrieval({
    learningCase: input.learningCase,
    label: learningLabel,
  });
  const reviewReason = `Donald manual review: ${REVIEW_ACTION_LABELS[input.action]}${
    notes ? ` - ${notes}` : ""
  }`;
  const qualityReasons = [
    ...(input.learningCase.quality.qualityReasons ?? []).filter(
      (reason) => !reason.startsWith("Donald manual review:")
    ),
    reviewReason,
  ];

  return {
    reviewStatus,
    quality: {
      ...input.learningCase.quality,
      learningLabel,
      learningWeight: getDeliveryAgentLearningLabelWeight(learningLabel),
      canUseForPositiveRetrieval,
      excludeReason: learningLabel === "excluded" ? "donald_manual_review" : null,
      qualityReasons,
    },
    manualReview:
      input.action === "reset_pending"
        ? null
        : {
            reviewedAt: (input.reviewedAt ?? new Date()).toISOString(),
            reviewedBy: input.reviewedBy ?? null,
            action: input.action,
            previousLearningLabel,
            learningLabel,
            notes: notes || null,
          },
  };
}

export function getLearningCaseReviewReadiness(learningCase: DeliveryAgentLearningCaseContract) {
  return assessDeliveryAgentLearningBackfillReadiness(learningCase);
}

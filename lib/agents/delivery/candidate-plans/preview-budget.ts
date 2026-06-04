import type { RouteOptimizerPreviewRequest } from "@/lib/integrations/route-optimizer/types";

export type DeliveryAgentPreviewBudgetAction =
  | "candidate_preview"
  | "improved_candidate_preview"
  | "simple_route_preview";

export type DeliveryAgentPreviewBudgetPhase = "initial" | "repair";

export type DeliveryAgentPreviewBudgetConfig = {
  maxFullCandidateVariants: number;
  maxOptimizePreviewCalls: number;
  maxRepairPreviewCalls: number;
};

export type DeliveryAgentPreviewBudgetSummary = {
  correlationId: string;
  action: DeliveryAgentPreviewBudgetAction;
  status: "within_budget" | "budget_exhausted" | "rate_limited";
  maxFullCandidateVariants: number;
  fullCandidateVariantsConsidered: number;
  fullCandidateVariantsSelected: number;
  fullCandidateVariantsPreviewed: number;
  maxOptimizePreviewCalls: number;
  optimizePreviewCallsUsed: number;
  maxRepairPreviewCalls: number;
  repairPreviewCallsUsed: number;
  skippedCandidateCount: number;
  skippedPreviewCallCount: number;
  warnings: string[];
};

type BudgetConsumeInput = {
  candidateId: string;
  runSlot: string;
  phase: DeliveryAgentPreviewBudgetPhase;
  label: string;
};

export type BudgetConsumeResult =
  | {
      allowed: true;
      callIndex: number;
      idempotencyKey: string;
    }
  | {
      allowed: false;
      message: string;
    };

const DEFAULT_BUDGETS: Record<DeliveryAgentPreviewBudgetAction, DeliveryAgentPreviewBudgetConfig> = {
  candidate_preview: {
    maxFullCandidateVariants: 4,
    maxOptimizePreviewCalls: 12,
    maxRepairPreviewCalls: 2,
  },
  improved_candidate_preview: {
    maxFullCandidateVariants: 4,
    maxOptimizePreviewCalls: 12,
    maxRepairPreviewCalls: 2,
  },
  simple_route_preview: {
    maxFullCandidateVariants: 1,
    maxOptimizePreviewCalls: 1,
    maxRepairPreviewCalls: 0,
  },
};

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 160);
}

export class DeliveryAgentPreviewBudget {
  readonly action: DeliveryAgentPreviewBudgetAction;
  readonly correlationId: string;
  readonly config: DeliveryAgentPreviewBudgetConfig;

  fullCandidateVariantsConsidered = 0;
  fullCandidateVariantsSelected = 0;
  fullCandidateVariantsPreviewed = 0;
  optimizePreviewCallsUsed = 0;
  repairPreviewCallsUsed = 0;
  skippedCandidateCount = 0;
  skippedPreviewCallCount = 0;
  status: DeliveryAgentPreviewBudgetSummary["status"] = "within_budget";
  private readonly warningSet = new Set<string>();

  constructor(input: {
    action: DeliveryAgentPreviewBudgetAction;
    correlationId: string;
    config?: Partial<DeliveryAgentPreviewBudgetConfig>;
  }) {
    this.action = input.action;
    this.correlationId = input.correlationId;
    this.config = {
      ...DEFAULT_BUDGETS[input.action],
      ...input.config,
    };
  }

  recordVariantSelection(input: {
    considered: number;
    selected: number;
    skipped: number;
  }): void {
    this.fullCandidateVariantsConsidered = input.considered;
    this.fullCandidateVariantsSelected = input.selected;
    this.skippedCandidateCount += Math.max(input.skipped, 0);

    if (input.skipped > 0) {
      this.warningSet.add(
        `Preview budget selected ${input.selected} finalist candidate(s) from ${input.considered} local variant(s); ${input.skipped} unpreviewed variant(s) were not treated as proven recommendations.`
      );
    }
  }

  recordVariantPreviewed(): void {
    this.fullCandidateVariantsPreviewed += 1;
  }

  markRateLimited(): void {
    this.status = "rate_limited";
  }

  consume(input: BudgetConsumeInput): BudgetConsumeResult {
    const phaseLimit =
      input.phase === "repair" ? this.config.maxRepairPreviewCalls : Number.POSITIVE_INFINITY;

    if (this.optimizePreviewCallsUsed >= this.config.maxOptimizePreviewCalls) {
      return this.reject(
        `Route preview budget exhausted before ${input.label}. No paid preview call was sent.`
      );
    }

    if (input.phase === "repair" && this.repairPreviewCallsUsed >= phaseLimit) {
      return this.reject(
        `Repair preview budget exhausted before ${input.label}. No paid repair preview call was sent.`
      );
    }

    this.optimizePreviewCallsUsed += 1;
    if (input.phase === "repair") {
      this.repairPreviewCallsUsed += 1;
    }

    const callIndex = this.optimizePreviewCallsUsed;
    return {
      allowed: true,
      callIndex,
      idempotencyKey: sanitizeIdPart(
        `kapioo:${this.action}:${this.correlationId}:${input.candidateId}:${input.runSlot}:${input.phase}:${callIndex}`
      ),
    };
  }

  addWarning(warning: string): void {
    if (warning.trim()) {
      this.warningSet.add(warning);
    }
  }

  summary(): DeliveryAgentPreviewBudgetSummary {
    return {
      correlationId: this.correlationId,
      action: this.action,
      status: this.status,
      maxFullCandidateVariants: this.config.maxFullCandidateVariants,
      fullCandidateVariantsConsidered: this.fullCandidateVariantsConsidered,
      fullCandidateVariantsSelected: this.fullCandidateVariantsSelected,
      fullCandidateVariantsPreviewed: this.fullCandidateVariantsPreviewed,
      maxOptimizePreviewCalls: this.config.maxOptimizePreviewCalls,
      optimizePreviewCallsUsed: this.optimizePreviewCallsUsed,
      maxRepairPreviewCalls: this.config.maxRepairPreviewCalls,
      repairPreviewCallsUsed: this.repairPreviewCallsUsed,
      skippedCandidateCount: this.skippedCandidateCount,
      skippedPreviewCallCount: this.skippedPreviewCallCount,
      warnings: [...this.warningSet],
    };
  }

  private reject(message: string): BudgetConsumeResult {
    this.status = "budget_exhausted";
    this.skippedPreviewCallCount += 1;
    this.warningSet.add(message);
    return { allowed: false, message };
  }
}

export function createDeliveryAgentPreviewBudget(input: {
  action: DeliveryAgentPreviewBudgetAction;
  correlationId: string;
  config?: Partial<DeliveryAgentPreviewBudgetConfig>;
}): DeliveryAgentPreviewBudget {
  return new DeliveryAgentPreviewBudget(input);
}

export function addBudgetMetadataToPreviewPayload(input: {
  payload: RouteOptimizerPreviewRequest;
  budget: DeliveryAgentPreviewBudget;
  consume: Extract<BudgetConsumeResult, { allowed: true }>;
}): RouteOptimizerPreviewRequest {
  return {
    ...input.payload,
    planning_session_id: input.payload.planning_session_id ?? input.budget.correlationId,
    idempotency_key: input.payload.idempotency_key ?? input.consume.idempotencyKey,
  };
}

export function previewBudgetExhaustedError(message: string): Error {
  const error = new Error(message);
  error.name = "DeliveryAgentPreviewBudgetExhausted";
  return error;
}

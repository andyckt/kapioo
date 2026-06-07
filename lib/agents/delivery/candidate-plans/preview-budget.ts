import type {
  RouteOptimizerGoogleCostEstimate,
  RouteOptimizerPreviewRequest,
} from "@/lib/integrations/route-optimizer/types";

export type DeliveryAgentPreviewBudgetAction =
  | "candidate_preview"
  | "improved_candidate_preview"
  | "llm_candidate_preview"
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
  routeOptimizerGoogleCostEstimate?: RouteOptimizerGoogleCostEstimate;
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
  llm_candidate_preview: {
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
  private routeOptimizerGoogleCostEstimate: RouteOptimizerGoogleCostEstimate | undefined;
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

  recordRouteOptimizerGoogleCostEstimate(input: {
    estimate?: unknown;
    candidateId: string;
    runSlot: string;
    phase: DeliveryAgentPreviewBudgetPhase;
    callIndex: number;
  }): void {
    const estimate = normalizeGoogleCostEstimate(input.estimate);
    if (!estimate) {
      return;
    }

    this.routeOptimizerGoogleCostEstimate = sumGoogleCostEstimates(
      this.routeOptimizerGoogleCostEstimate,
      estimate
    );

    console.log(
      JSON.stringify({
        event: "delivery_agent.route_optimizer_preview.google_cost_estimate",
        action: this.action,
        correlationId: this.correlationId,
        candidateId: input.candidateId,
        runSlot: input.runSlot,
        phase: input.phase,
        optimizePreviewCallIndex: input.callIndex,
        google_cost_estimate: estimate,
      })
    );
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
      routeOptimizerGoogleCostEstimate: this.routeOptimizerGoogleCostEstimate,
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

function sumGoogleCostEstimates(
  left: RouteOptimizerGoogleCostEstimate | undefined,
  right: RouteOptimizerGoogleCostEstimate
): RouteOptimizerGoogleCostEstimate {
  if (!left) {
    return { ...right };
  }

  return {
    customer_count: left.customer_count + right.customer_count,
    customer_geocoding_requests:
      left.customer_geocoding_requests + right.customer_geocoding_requests,
    start_geocoding_requests:
      left.start_geocoding_requests + right.start_geocoding_requests,
    end_geocoding_requests: left.end_geocoding_requests + right.end_geocoding_requests,
    geocoding_requests: left.geocoding_requests + right.geocoding_requests,
    route_optimization_requests:
      left.route_optimization_requests + right.route_optimization_requests,
    route_optimization_billable_units:
      left.route_optimization_billable_units + right.route_optimization_billable_units,
    directions_requests: left.directions_requests + right.directions_requests,
    estimated_billable_units:
      left.estimated_billable_units + right.estimated_billable_units,
  };
}

function readFiniteNumber(record: Record<string, unknown>, key: keyof RouteOptimizerGoogleCostEstimate): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeGoogleCostEstimate(value: unknown): RouteOptimizerGoogleCostEstimate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const customer_count = readFiniteNumber(record, "customer_count");
  const customer_geocoding_requests = readFiniteNumber(record, "customer_geocoding_requests");
  const start_geocoding_requests = readFiniteNumber(record, "start_geocoding_requests");
  const end_geocoding_requests = readFiniteNumber(record, "end_geocoding_requests");
  const geocoding_requests = readFiniteNumber(record, "geocoding_requests");
  const route_optimization_requests = readFiniteNumber(record, "route_optimization_requests");
  const route_optimization_billable_units = readFiniteNumber(
    record,
    "route_optimization_billable_units"
  );
  const directions_requests = readFiniteNumber(record, "directions_requests");
  const estimated_billable_units = readFiniteNumber(record, "estimated_billable_units");

  if (
    customer_count === null ||
    customer_geocoding_requests === null ||
    start_geocoding_requests === null ||
    end_geocoding_requests === null ||
    geocoding_requests === null ||
    route_optimization_requests === null ||
    route_optimization_billable_units === null ||
    directions_requests === null ||
    estimated_billable_units === null
  ) {
    return null;
  }

  return {
    customer_count,
    customer_geocoding_requests,
    start_geocoding_requests,
    end_geocoding_requests,
    geocoding_requests,
    route_optimization_requests,
    route_optimization_billable_units,
    directions_requests,
    estimated_billable_units,
  };
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

export function readRouteOptimizerGoogleCostEstimate(
  value: unknown
): RouteOptimizerGoogleCostEstimate | undefined {
  return normalizeGoogleCostEstimate(value) ?? undefined;
}

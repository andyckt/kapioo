import { z } from "zod";

import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES,
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  deliveryAgentLlmCandidateOutputSchema,
  type DeliveryAgentLlmCandidateOutput,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentLlmCandidateOutputParseResult,
  type DeliveryAgentLlmCandidateValidationIssue,
  type DeliveryAgentLlmCandidateValidationResult,
  type DeliveryAgentLlmPromptPackage,
} from "@/lib/contracts/delivery-agent-llm-planning";

export type ParseDeliveryAgentLlmCandidateOutputInput = {
  promptPackage: DeliveryAgentLlmPromptPackage;
  rawOutput: unknown;
  maxAcceptedCandidates?: number;
};

const UNSAFE_RECOMMENDATION_KEYS = [
  "recommendedCandidateId",
  "recommendedPlan",
  "recommendationStatus",
  "selectedCandidateId",
  "provenCandidateId",
] as const;

const UNSAFE_CANDIDATE_CLAIM_KEYS = [
  "recommended",
  "recommendationStatus",
  "routeOptimizerProof",
  "routeOptimizerPreview",
  "proven",
] as const;

function makeIssue(
  issue: Omit<DeliveryAgentLlmCandidateValidationIssue, "severity"> & {
    severity?: DeliveryAgentLlmCandidateValidationIssue["severity"];
  }
): DeliveryAgentLlmCandidateValidationIssue {
  return {
    ...issue,
    severity: issue.severity ?? "error",
  };
}

function emptyInvalidResult(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  issues: DeliveryAgentLlmCandidateValidationIssue[];
  warnings?: string[];
}): DeliveryAgentLlmCandidateOutputParseResult {
  return {
    status: "invalid",
    outputSchemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
    acceptedCandidates: [],
    rejectedCandidates: [],
    omittedCandidates: [],
    candidateValidations: [],
    issues: input.issues,
    warnings:
      input.warnings ??
      input.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
  };
}

function parseRawJson(rawOutput: unknown): {
  value?: unknown;
  issue?: DeliveryAgentLlmCandidateValidationIssue;
} {
  if (typeof rawOutput !== "string") {
    return { value: rawOutput };
  }

  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return {
      issue: makeIssue({
        code: "empty_output",
        message: "LLM output was empty.",
      }),
    };
  }

  try {
    return { value: JSON.parse(trimmed) as unknown };
  } catch (error) {
    return {
      issue: makeIssue({
        code: "invalid_json",
        message: error instanceof Error ? error.message : "LLM output was not valid JSON.",
      }),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatZodPath(path: Array<string | number | symbol>): string {
  if (path.length === 0) {
    return "root";
  }

  return path.map((part) => String(part)).join(".");
}

function zodIssuesToValidationIssues(error: z.ZodError): DeliveryAgentLlmCandidateValidationIssue[] {
  return error.issues.slice(0, 8).map((issue) =>
    makeIssue({
      code: "schema_validation_failed",
      message: `${formatZodPath(issue.path)}: ${issue.message}`,
      details: {
        path: issue.path,
        zodCode: issue.code,
      },
    })
  );
}

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  return unique;
}

function sortedMissing(expectedOrderIds: string[], assigned: Set<string>): string[] {
  return expectedOrderIds.filter((orderId) => !assigned.has(orderId));
}

function detectDuplicateOrderIds(orderIds: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const orderId of orderIds) {
    if (seen.has(orderId)) {
      duplicates.push(orderId);
      continue;
    }

    seen.add(orderId);
  }

  return uniqueInOriginalOrder(duplicates);
}

function detectUnsafeRecommendationClaims(value: unknown): DeliveryAgentLlmCandidateValidationIssue[] {
  if (!isRecord(value)) {
    return [];
  }

  const issues: DeliveryAgentLlmCandidateValidationIssue[] = [];

  for (const key of UNSAFE_RECOMMENDATION_KEYS) {
    if (key in value) {
      issues.push(
        makeIssue({
          code: "llm_recommendation_claim_ignored",
          severity: "warning",
          message: `LLM output included ${key}, but LLM output is never treated as a recommendation before local/RO proof.`,
          details: { key },
        })
      );
    }
  }

  const candidates = value.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      if (!isRecord(candidate)) {
        continue;
      }

      const candidateId =
        typeof candidate.candidateId === "string" ? candidate.candidateId : undefined;

      for (const key of UNSAFE_CANDIDATE_CLAIM_KEYS) {
        if (key in candidate) {
          issues.push(
            makeIssue({
              code: "llm_candidate_proof_claim_ignored",
              severity: "warning",
              message: `Candidate ${candidateId ?? "unknown"} included ${key}, but proof/recommendation claims are ignored until local/RO validation.`,
              candidateId,
              details: { key },
            })
          );
        }
      }
    }
  }

  return issues;
}

function collectAssignedOrderIds(candidate: DeliveryAgentLlmCandidateOutputCandidate): string[] {
  return candidate.runs.flatMap((run) => run.orderIds);
}

function getBackupAssignedOrderIds(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  backupRunSlots: Set<string>;
}): string[] {
  return input.candidate.runs
    .filter((run) => input.backupRunSlots.has(run.runSlot))
    .flatMap((run) => run.orderIds);
}

function symmetricDifference(left: string[], right: string[]): string[] {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const diff: string[] = [];

  for (const value of left) {
    if (!rightSet.has(value)) {
      diff.push(value);
    }
  }

  for (const value of right) {
    if (!leftSet.has(value)) {
      diff.push(value);
    }
  }

  return uniqueInOriginalOrder(diff);
}

function validateCandidate(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  expectedOrderIds: string[];
  expectedOrderIdSet: Set<string>;
  knownRunSlots: Set<string>;
  backupRunSlots: Set<string>;
  selfFallbackEnabled: boolean;
  maxPreferredSelfStops: number;
  duplicatedCandidateIds: Set<string>;
}): DeliveryAgentLlmCandidateValidationResult {
  const assignedOrderIds = collectAssignedOrderIds(input.candidate);
  const assignedOrderIdSet = new Set(assignedOrderIds);
  const duplicateOrderIds = detectDuplicateOrderIds(assignedOrderIds);
  const inventedOrderIds = uniqueInOriginalOrder(
    assignedOrderIds.filter((orderId) => !input.expectedOrderIdSet.has(orderId))
  );
  const missingOrderIds = sortedMissing(input.expectedOrderIds, assignedOrderIdSet);
  const unknownRunSlots = uniqueInOriginalOrder(
    input.candidate.runs
      .map((run) => run.runSlot)
      .filter((runSlot) => !input.knownRunSlots.has(runSlot))
  );
  const backupAssignedOrderIds = getBackupAssignedOrderIds({
    candidate: input.candidate,
    backupRunSlots: input.backupRunSlots,
  });
  const selfMetadataMismatch = symmetricDifference(
    input.candidate.selfUse.orderIds,
    backupAssignedOrderIds
  );
  const selfUsedFlagMismatch =
    input.candidate.selfUse.used !== (backupAssignedOrderIds.length > 0);
  const issues: DeliveryAgentLlmCandidateValidationIssue[] = [];

  if (input.duplicatedCandidateIds.has(input.candidate.candidateId)) {
    issues.push(
      makeIssue({
        code: "duplicate_candidate_id",
        message: "Candidate ID was repeated in the LLM output.",
        candidateId: input.candidate.candidateId,
      })
    );
  }

  if (missingOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "missing_order_ids",
        message: `${missingOrderIds.length} provided order(s) were not assigned by this candidate.`,
        candidateId: input.candidate.candidateId,
        details: { orderIds: missingOrderIds },
      })
    );
  }

  if (duplicateOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "duplicate_order_ids",
        message: `${duplicateOrderIds.length} order(s) were assigned more than once by this candidate.`,
        candidateId: input.candidate.candidateId,
        details: { orderIds: duplicateOrderIds },
      })
    );
  }

  if (inventedOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "invented_order_ids",
        message: `${inventedOrderIds.length} order(s) were invented or were not in the prompt.`,
        candidateId: input.candidate.candidateId,
        details: { orderIds: inventedOrderIds },
      })
    );
  }

  if (unknownRunSlots.length > 0) {
    issues.push(
      makeIssue({
        code: "unknown_run_slots",
        message: `${unknownRunSlots.length} run slot(s) were not in the planning profile.`,
        candidateId: input.candidate.candidateId,
        details: { runSlots: unknownRunSlots },
      })
    );
  }

  if (!input.selfFallbackEnabled && backupAssignedOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "self_fallback_disabled",
        message: "Candidate assigned orders to a backup/self run while self fallback is disabled.",
        candidateId: input.candidate.candidateId,
        details: { orderIds: backupAssignedOrderIds },
      })
    );
  }

  const handoffRunSlots = [
    input.candidate.handoffPlan.providerRunSlot,
    input.candidate.handoffPlan.receiverRunSlot,
  ].filter((runSlot): runSlot is string => typeof runSlot === "string");
  const unknownHandoffRunSlots = uniqueInOriginalOrder(
    handoffRunSlots.filter((runSlot) => !input.knownRunSlots.has(runSlot))
  );

  if (unknownHandoffRunSlots.length > 0) {
    issues.push(
      makeIssue({
        code: "handoff_references_unknown_run_slot",
        severity: "warning",
        message: "Candidate handoff plan references a run slot outside the planning profile.",
        candidateId: input.candidate.candidateId,
        details: { runSlots: unknownHandoffRunSlots },
      })
    );
  }

  const handoffOrderIds = [
    ...(input.candidate.handoffPlan.sourceOrderIds ?? []),
    input.candidate.handoffPlan.stopBeforeMeetupOrderId,
  ].filter((orderId): orderId is string => typeof orderId === "string");
  const unknownHandoffOrderIds = uniqueInOriginalOrder(
    handoffOrderIds.filter((orderId) => !input.expectedOrderIdSet.has(orderId))
  );

  if (unknownHandoffOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "handoff_references_unknown_order",
        severity: "warning",
        message: "Candidate handoff plan references an order outside the prompt.",
        candidateId: input.candidate.candidateId,
        details: { orderIds: unknownHandoffOrderIds },
      })
    );
  }

  if (selfMetadataMismatch.length > 0 || selfUsedFlagMismatch) {
    issues.push(
      makeIssue({
        code: "self_use_metadata_mismatch",
        severity: "warning",
        message: "Candidate selfUse metadata does not match the actual backup/self run assignment.",
        candidateId: input.candidate.candidateId,
        details: {
          selfUseOrderIds: input.candidate.selfUse.orderIds,
          backupRunOrderIds: backupAssignedOrderIds,
          mismatchOrderIds: selfMetadataMismatch,
        },
      })
    );
  }

  if (backupAssignedOrderIds.length > input.maxPreferredSelfStops) {
    issues.push(
      makeIssue({
        code: "self_stop_count_above_preference",
        severity: "warning",
        message: `Candidate uses ${backupAssignedOrderIds.length} backup/self stop(s), above the preferred maximum ${input.maxPreferredSelfStops}.`,
        candidateId: input.candidate.candidateId,
        details: {
          orderIds: backupAssignedOrderIds,
          maxPreferredSelfStops: input.maxPreferredSelfStops,
        },
      })
    );
  }

  const hardRuleValidation = {
    allOrdersAssignedExactlyOnce:
      missingOrderIds.length === 0 &&
      duplicateOrderIds.length === 0 &&
      inventedOrderIds.length === 0,
    noDuplicateOrderIds: duplicateOrderIds.length === 0,
    noInventedOrderIds: inventedOrderIds.length === 0,
    runSlotsKnown: unknownRunSlots.length === 0,
    selfUseConsistent: selfMetadataMismatch.length === 0 && !selfUsedFlagMismatch,
  };
  const hasBlockingIssue = issues.some((issue) => issue.severity === "error");

  return {
    candidateId: input.candidate.candidateId,
    accepted: !hasBlockingIssue,
    assignedOrderIds,
    missingOrderIds,
    duplicateOrderIds,
    inventedOrderIds,
    unknownRunSlots,
    hardRuleValidation,
    issues,
  };
}

function buildChecklistMismatchIssues(input: {
  output: DeliveryAgentLlmCandidateOutput;
  validations: DeliveryAgentLlmCandidateValidationResult[];
}): DeliveryAgentLlmCandidateValidationIssue[] {
  const issues: DeliveryAgentLlmCandidateValidationIssue[] = [];
  const everyCandidateAssignsOrdersOnce = input.validations.every(
    (validation) => validation.hardRuleValidation.allOrdersAssignedExactlyOnce
  );
  const noDuplicateOrderIds = input.validations.every(
    (validation) => validation.hardRuleValidation.noDuplicateOrderIds
  );
  const noInventedOrderIds = input.validations.every(
    (validation) => validation.hardRuleValidation.noInventedOrderIds
  );

  const checks: Array<{
    key: keyof DeliveryAgentLlmCandidateOutput["hardRuleChecklist"];
    actual: boolean;
  }> = [
    { key: "allOrdersAssignedExactlyOnce", actual: everyCandidateAssignsOrdersOnce },
    { key: "noDuplicateOrderIds", actual: noDuplicateOrderIds },
    { key: "noInventedOrderIds", actual: noInventedOrderIds },
  ];

  for (const check of checks) {
    if (input.output.hardRuleChecklist[check.key] !== check.actual) {
      issues.push(
        makeIssue({
          code: "hard_rule_checklist_mismatch",
          severity: "warning",
          message: `LLM hardRuleChecklist.${check.key} was ${input.output.hardRuleChecklist[check.key]}, but deterministic validation found ${check.actual}.`,
          details: {
            key: check.key,
            claimed: input.output.hardRuleChecklist[check.key],
            actual: check.actual,
          },
        })
      );
    }
  }

  return issues;
}

function collectWarnings(input: {
  output?: DeliveryAgentLlmCandidateOutput;
  issues: DeliveryAgentLlmCandidateValidationIssue[];
}): string[] {
  return uniqueInOriginalOrder([
    ...(input.output?.warnings ?? []),
    ...input.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
  ]);
}

export function parseDeliveryAgentLlmCandidateOutput(
  input: ParseDeliveryAgentLlmCandidateOutputInput
): DeliveryAgentLlmCandidateOutputParseResult {
  const maxAcceptedCandidates = Math.max(
    0,
    input.maxAcceptedCandidates ?? DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES
  );
  const decoded = parseRawJson(input.rawOutput);

  if (decoded.issue) {
    return emptyInvalidResult({
      promptPackage: input.promptPackage,
      issues: [decoded.issue],
    });
  }

  const unsafeClaimIssues = detectUnsafeRecommendationClaims(decoded.value);
  const parsed = deliveryAgentLlmCandidateOutputSchema.safeParse(decoded.value);

  if (!parsed.success) {
    const issues = [...unsafeClaimIssues, ...zodIssuesToValidationIssues(parsed.error)];

    return emptyInvalidResult({
      promptPackage: input.promptPackage,
      issues,
      warnings: collectWarnings({ issues }),
    });
  }

  const output = parsed.data;
  const expectedOrderIds = input.promptPackage.promptInput.orders.map((order) => order.orderId);
  const duplicatedCandidateIds = new Set(
    detectDuplicateOrderIds(output.candidates.map((candidate) => candidate.candidateId))
  );
  const knownRunSlots = new Set(
    input.promptPackage.promptInput.profile.drivers.map((driver) => driver.runSlot)
  );
  const backupRunSlots = new Set(
    input.promptPackage.promptInput.profile.drivers
      .filter((driver) => driver.isBackupOnly)
      .map((driver) => driver.runSlot)
  );
  const candidateValidations = output.candidates.map((candidate) =>
    validateCandidate({
      candidate,
      expectedOrderIds,
      expectedOrderIdSet: new Set(expectedOrderIds),
      knownRunSlots,
      backupRunSlots,
      selfFallbackEnabled: input.promptPackage.promptInput.profile.selfFallback.enabled,
      maxPreferredSelfStops: input.promptPackage.promptInput.profile.selfFallback.maxPreferredStops,
      duplicatedCandidateIds,
    })
  );
  const candidateIssues = candidateValidations.flatMap((validation) => validation.issues);
  const issues = [
    ...unsafeClaimIssues,
    ...candidateIssues,
    ...buildChecklistMismatchIssues({ output, validations: candidateValidations }),
  ];

  if (output.candidates.length === 0) {
    issues.push(
      makeIssue({
        code: "no_candidates",
        message: "LLM output did not include any candidate plans.",
      })
    );
  }

  if (output.summary.candidateCount !== output.candidates.length) {
    issues.push(
      makeIssue({
        code: "candidate_count_mismatch",
        severity: "warning",
        message: `LLM summary candidateCount was ${output.summary.candidateCount}, but candidates length was ${output.candidates.length}.`,
        details: {
          claimed: output.summary.candidateCount,
          actual: output.candidates.length,
        },
      })
    );
  }

  if (output.candidates.length > maxAcceptedCandidates) {
    issues.push(
      makeIssue({
        code: "candidate_limit_exceeded",
        severity: "warning",
        message: `LLM returned ${output.candidates.length} candidate(s); only the first ${maxAcceptedCandidates} valid candidate(s) can continue.`,
        details: {
          returnedCandidateCount: output.candidates.length,
          maxAcceptedCandidates,
        },
      })
    );
  }

  const acceptedBeforeLimit = output.candidates.filter((_candidate, index) => {
    return candidateValidations[index]?.accepted ?? false;
  });
  const acceptedCandidates = acceptedBeforeLimit.slice(0, maxAcceptedCandidates);
  const acceptedCandidateIds = new Set(acceptedCandidates.map((candidate) => candidate.candidateId));
  const rejectedCandidates = output.candidates.filter((_candidate, index) => {
    return !(candidateValidations[index]?.accepted ?? false);
  });
  const omittedCandidates = acceptedBeforeLimit.filter(
    (candidate) => !acceptedCandidateIds.has(candidate.candidateId)
  );
  const warnings = collectWarnings({ output, issues });
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const status =
    acceptedCandidates.length === 0
      ? "invalid"
      : hasErrors ||
          rejectedCandidates.length > 0 ||
          omittedCandidates.length > 0 ||
          warnings.length > 0
        ? "partial_valid"
        : "valid";

  return {
    status,
    outputSchemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
    acceptedCandidates,
    rejectedCandidates,
    omittedCandidates,
    parsedOutput: output,
    candidateValidations,
    issues,
    warnings,
  };
}

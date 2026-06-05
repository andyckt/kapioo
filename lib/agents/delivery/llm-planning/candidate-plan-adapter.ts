import {
  buildCandidateRunsFromAssignment,
  buildDefaultHandoffPlan,
} from "@/lib/agents/delivery/candidate-plans/build-candidate-runs";
import { attachSummaryToCandidate } from "@/lib/agents/delivery/candidate-plans/summarize-candidate-plan";
import type {
  CandidatePlan,
  PlanningStop,
  StopAssignment,
} from "@/lib/agents/delivery/candidate-plans/types";
import type {
  DeliveryPlanningProfile,
  DeliveryPlanningRunSlot,
} from "@/lib/agents/delivery/planning-profile/types";
import {
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES,
  type DeliveryAgentLlmCandidateOutputCandidate,
  type DeliveryAgentLlmCandidateOutputParseResult,
  type DeliveryAgentLlmCandidateValidationIssue,
  type DeliveryAgentLlmPromptPackage,
} from "@/lib/contracts/delivery-agent-llm-planning";

export type DeliveryAgentLlmCandidatePlanBuildStatus =
  | "built"
  | "partial"
  | "blocked";

export type DeliveryAgentLlmCandidatePlanBuildIssue = {
  code: string;
  severity: "warning" | "error";
  message: string;
  candidateId?: string;
  orderId?: string;
  details?: Record<string, unknown>;
};

export type DeliveryAgentLlmCandidatePlanBuildResult = {
  status: DeliveryAgentLlmCandidatePlanBuildStatus;
  deliveryDate: string;
  profileId: string;
  profileVersion: string;
  planningFingerprint: string;
  candidatePlans: CandidatePlan[];
  omittedCandidateIds: string[];
  rejectedCandidateIds: string[];
  issues: DeliveryAgentLlmCandidatePlanBuildIssue[];
  warnings: string[];
};

export type BuildDeliveryAgentCandidatePlansFromLlmOutputInput = {
  promptPackage: DeliveryAgentLlmPromptPackage;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
  planningStops: PlanningStop[];
  profile: DeliveryPlanningProfile;
  maxCandidatePlans?: number;
};

const RUN_SLOT_TO_ASSIGNMENT_KEY: Record<DeliveryPlanningRunSlot, keyof StopAssignment> = {
  A: "dt",
  B: "marco",
  C: "self",
};

function makeIssue(input: DeliveryAgentLlmCandidatePlanBuildIssue): DeliveryAgentLlmCandidatePlanBuildIssue {
  return input;
}

function collectWarnings(issues: DeliveryAgentLlmCandidatePlanBuildIssue[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const issue of issues) {
    if (issue.severity !== "warning" || seen.has(issue.message)) {
      continue;
    }

    seen.add(issue.message);
    warnings.push(issue.message);
  }

  return warnings;
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

function detectDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.push(value);
      continue;
    }

    seen.add(value);
  }

  return uniqueInOriginalOrder(duplicates);
}

function setDifference(left: string[], right: Set<string>): string[] {
  return left.filter((value) => !right.has(value));
}

function sameOrderSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function buildPlanningStopMap(stops: PlanningStop[]): {
  stopMap: Map<string, PlanningStop>;
  duplicateOrderIds: string[];
} {
  return {
    stopMap: new Map(stops.map((stop) => [stop.orderId, stop])),
    duplicateOrderIds: detectDuplicates(stops.map((stop) => stop.orderId)),
  };
}

function profileRunSlotSet(profile: DeliveryPlanningProfile): Set<DeliveryPlanningRunSlot> {
  return new Set(profile.drivers.map((driver) => driver.runSlot));
}

function toPlanningRunSlot(value: string): DeliveryPlanningRunSlot | null {
  return value === "A" || value === "B" || value === "C" ? value : null;
}

function mapParserIssue(
  issue: DeliveryAgentLlmCandidateValidationIssue
): DeliveryAgentLlmCandidatePlanBuildIssue {
  return {
    code: `parser_${issue.code}`,
    severity: issue.severity,
    message: issue.message,
    candidateId: issue.candidateId,
    orderId: issue.orderId,
    details: issue.details,
  };
}

function buildBlockedResult(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  profile: DeliveryPlanningProfile;
  issues: DeliveryAgentLlmCandidatePlanBuildIssue[];
}): DeliveryAgentLlmCandidatePlanBuildResult {
  return {
    status: "blocked",
    deliveryDate: input.promptPackage.deliveryDate,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
    candidatePlans: [],
    omittedCandidateIds: [],
    rejectedCandidateIds: [],
    issues: input.issues,
    warnings: collectWarnings(input.issues),
  };
}

function validateInputConsistency(input: {
  promptPackage: DeliveryAgentLlmPromptPackage;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
  planningStops: PlanningStop[];
  profile: DeliveryPlanningProfile;
}): DeliveryAgentLlmCandidatePlanBuildIssue[] {
  const issues: DeliveryAgentLlmCandidatePlanBuildIssue[] = [];
  const promptOrderIds = input.promptPackage.promptInput.orders.map((order) => order.orderId);
  const planningStopOrderIds = input.planningStops.map((stop) => stop.orderId);
  const promptOrderIdSet = new Set(promptOrderIds);
  const planningStopIdSet = new Set(planningStopOrderIds);
  const duplicatePromptOrderIds = detectDuplicates(promptOrderIds);
  const duplicatePlanningStopIds = detectDuplicates(planningStopOrderIds);

  if (
    input.parseResult.planningFingerprint !==
    input.promptPackage.planningFingerprint.planningFingerprint
  ) {
    issues.push(
      makeIssue({
        code: "planning_fingerprint_mismatch",
        severity: "error",
        message: "LLM parse result does not match the prompt package planning fingerprint.",
        details: {
          promptFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
          parseFingerprint: input.parseResult.planningFingerprint,
        },
      })
    );
  }

  if (
    input.profile.profileId !== input.promptPackage.profileId ||
    input.profile.profileVersion !== input.promptPackage.profileVersion
  ) {
    issues.push(
      makeIssue({
        code: "profile_mismatch",
        severity: "error",
        message: "Planning profile does not match the LLM prompt package.",
        details: {
          promptProfileId: input.promptPackage.profileId,
          promptProfileVersion: input.promptPackage.profileVersion,
          profileId: input.profile.profileId,
          profileVersion: input.profile.profileVersion,
        },
      })
    );
  }

  if (duplicatePromptOrderIds.length > 0) {
    issues.push(
      makeIssue({
        code: "duplicate_prompt_order_ids",
        severity: "error",
        message: "LLM prompt package contains duplicate order IDs.",
        details: { orderIds: duplicatePromptOrderIds },
      })
    );
  }

  if (duplicatePlanningStopIds.length > 0) {
    issues.push(
      makeIssue({
        code: "duplicate_planning_stop_order_ids",
        severity: "error",
        message: "Local planning stops contain duplicate order IDs.",
        details: { orderIds: duplicatePlanningStopIds },
      })
    );
  }

  if (!sameOrderSet(promptOrderIds, planningStopOrderIds)) {
    issues.push(
      makeIssue({
        code: "planning_stop_prompt_order_mismatch",
        severity: "error",
        message: "Local planning stops do not exactly match the order set used by the LLM prompt.",
        details: {
          missingFromPlanningStops: setDifference(promptOrderIds, planningStopIdSet),
          extraPlanningStops: setDifference(planningStopOrderIds, promptOrderIdSet),
        },
      })
    );
  }

  if (input.parseResult.status === "invalid") {
    issues.push(
      makeIssue({
        code: "parse_result_invalid",
        severity: "error",
        message: "LLM candidate output parse result is invalid; no local plan can be built.",
      })
    );
  }

  return issues;
}

function buildCandidateWarnings(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
}): string[] {
  const parserWarnings = input.parseResult.issues
    .filter(
      (issue) =>
        issue.severity === "warning" && issue.candidateId === input.candidate.candidateId
    )
    .map((issue) => issue.message);

  return uniqueInOriginalOrder([
    ...(input.candidate.warnings ?? []),
    ...input.candidate.risks.map((risk) => `LLM risk: ${risk}`),
    ...parserWarnings,
  ]);
}

function buildCandidateAssumptions(candidate: DeliveryAgentLlmCandidateOutputCandidate): string[] {
  const assumptions = [
    "Source: accepted LLM candidate idea; local/Route Optimizer proof is still required before recommendation.",
    `LLM candidate ID: ${candidate.candidateId}`,
  ];

  if (candidate.handoffPlan.strategy) {
    assumptions.push(`Handoff idea: ${candidate.handoffPlan.strategy}`);
  }

  if (candidate.expectedStrengths?.length) {
    assumptions.push(
      ...candidate.expectedStrengths.map((strength) => `Expected strength: ${strength}`)
    );
  }

  if (candidate.historicalCaseIdsUsed.length > 0) {
    assumptions.push(`Historical cases used: ${candidate.historicalCaseIdsUsed.join(", ")}`);
  }

  return assumptions;
}

function buildHandoffPlan(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  profile: DeliveryPlanningProfile;
}) {
  const defaultPlan = buildDefaultHandoffPlan(input.profile);
  const profileRunSlots = profileRunSlotSet(input.profile);
  const providerRunSlot = input.candidate.handoffPlan.providerRunSlot
    ? toPlanningRunSlot(input.candidate.handoffPlan.providerRunSlot)
    : null;
  const receiverRunSlot = input.candidate.handoffPlan.receiverRunSlot
    ? toPlanningRunSlot(input.candidate.handoffPlan.receiverRunSlot)
    : null;
  const noteParts = [
    "LLM handoff idea only; exact meet-up selection happens in local preview.",
  ];

  if (input.candidate.handoffPlan.strategy) {
    noteParts.push(input.candidate.handoffPlan.strategy);
  }

  if (input.candidate.handoffPlan.suggestedMeetupArea) {
    noteParts.push(`Suggested area: ${input.candidate.handoffPlan.suggestedMeetupArea}.`);
  }

  if (input.candidate.handoffPlan.sourceOrderIds?.length) {
    noteParts.push(
      `Source order hints: ${input.candidate.handoffPlan.sourceOrderIds.join(", ")}.`
    );
  }

  return {
    ...defaultPlan,
    providerRunSlot:
      providerRunSlot && profileRunSlots.has(providerRunSlot)
        ? providerRunSlot
        : defaultPlan.providerRunSlot,
    receiverRunSlot:
      receiverRunSlot && profileRunSlots.has(receiverRunSlot)
        ? receiverRunSlot
        : defaultPlan.receiverRunSlot,
    note: noteParts.join(" "),
  };
}

function buildAssignmentFromCandidate(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  stopMap: Map<string, PlanningStop>;
  profile: DeliveryPlanningProfile;
}): { assignment: StopAssignment; issues: DeliveryAgentLlmCandidatePlanBuildIssue[] } {
  const assignment: StopAssignment = {
    dt: [],
    marco: [],
    self: [],
  };
  const issues: DeliveryAgentLlmCandidatePlanBuildIssue[] = [];
  const assignedOrderIds: string[] = [];
  const profileRunSlots = profileRunSlotSet(input.profile);

  for (const run of input.candidate.runs) {
    const runSlot = toPlanningRunSlot(run.runSlot);

    if (!runSlot || !profileRunSlots.has(runSlot)) {
      issues.push(
        makeIssue({
          code: "unknown_run_slot",
          severity: "error",
          message: "Accepted LLM candidate uses a run slot outside the planning profile.",
          candidateId: input.candidate.candidateId,
          details: { runSlot: run.runSlot },
        })
      );
      continue;
    }

    const bucket = RUN_SLOT_TO_ASSIGNMENT_KEY[runSlot];

    for (const orderId of run.orderIds) {
      const stop = input.stopMap.get(orderId);
      assignedOrderIds.push(orderId);

      if (!stop) {
        issues.push(
          makeIssue({
            code: "candidate_references_missing_planning_stop",
            severity: "error",
            message: "Accepted LLM candidate references an order missing from local planning stops.",
            candidateId: input.candidate.candidateId,
            orderId,
          })
        );
        continue;
      }

      assignment[bucket].push(stop);
    }
  }

  const duplicateAssignments = detectDuplicates(assignedOrderIds);
  if (duplicateAssignments.length > 0) {
    issues.push(
      makeIssue({
        code: "candidate_duplicate_assignments",
        severity: "error",
        message: "Accepted LLM candidate assigns at least one order more than once.",
        candidateId: input.candidate.candidateId,
        details: { orderIds: duplicateAssignments },
      })
    );
  }

  const missingAssignments = setDifference([...input.stopMap.keys()], new Set(assignedOrderIds));
  if (missingAssignments.length > 0) {
    issues.push(
      makeIssue({
        code: "candidate_missing_assignments",
        severity: "error",
        message: "Accepted LLM candidate does not assign every local planning stop.",
        candidateId: input.candidate.candidateId,
        details: { orderIds: missingAssignments },
      })
    );
  }

  return { assignment, issues };
}

function buildCandidatePlan(input: {
  candidate: DeliveryAgentLlmCandidateOutputCandidate;
  assignment: StopAssignment;
  profile: DeliveryPlanningProfile;
  deliveryDate: string;
  parseResult: DeliveryAgentLlmCandidateOutputParseResult;
}): CandidatePlan {
  const runs = buildCandidateRunsFromAssignment(input.profile, input.assignment);
  const warnings = buildCandidateWarnings({
    candidate: input.candidate,
    parseResult: input.parseResult,
  });
  const baseCandidate: Omit<CandidatePlan, "summary"> = {
    candidateId: `llm:${input.deliveryDate}:${input.candidate.candidateId}`,
    name: `LLM: ${input.candidate.strategyName}`,
    description: input.candidate.reasoningSummary,
    strategyType: "llm_generated",
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    deliveryDate: input.deliveryDate,
    runs,
    warnings,
    assumptions: buildCandidateAssumptions(input.candidate),
    handoffPlan: buildHandoffPlan({
      candidate: input.candidate,
      profile: input.profile,
    }),
    constraintPlan: {
      fixedStops: [],
      endPoint: null,
      repairActionsPlanned: [],
    },
  };

  return attachSummaryToCandidate(baseCandidate, input.assignment);
}

export function buildDeliveryAgentCandidatePlansFromLlmOutput(
  input: BuildDeliveryAgentCandidatePlansFromLlmOutputInput
): DeliveryAgentLlmCandidatePlanBuildResult {
  const consistencyIssues = validateInputConsistency(input);

  if (consistencyIssues.some((issue) => issue.severity === "error")) {
    return buildBlockedResult({
      promptPackage: input.promptPackage,
      profile: input.profile,
      issues: [
        ...consistencyIssues,
        ...input.parseResult.issues.map(mapParserIssue),
      ],
    });
  }

  const maxCandidatePlans = Math.max(
    0,
    input.maxCandidatePlans ?? DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_MAX_CANDIDATES
  );
  const { stopMap } = buildPlanningStopMap(input.planningStops);
  const acceptedCandidates = input.parseResult.acceptedCandidates.slice(0, maxCandidatePlans);
  const omittedCandidateIds = [
    ...input.parseResult.acceptedCandidates
      .slice(maxCandidatePlans)
      .map((candidate) => candidate.candidateId),
    ...input.parseResult.omittedCandidates.map((candidate) => candidate.candidateId),
  ];
  const rejectedCandidateIds = input.parseResult.rejectedCandidates.map(
    (candidate) => candidate.candidateId
  );
  const candidatePlans: CandidatePlan[] = [];
  const issues: DeliveryAgentLlmCandidatePlanBuildIssue[] = [
    ...consistencyIssues,
    ...input.parseResult.issues.map(mapParserIssue),
  ];

  for (const candidate of acceptedCandidates) {
    const assignmentResult = buildAssignmentFromCandidate({
      candidate,
      stopMap,
      profile: input.profile,
    });

    if (assignmentResult.issues.some((issue) => issue.severity === "error")) {
      issues.push(...assignmentResult.issues);
      rejectedCandidateIds.push(candidate.candidateId);
      continue;
    }

    issues.push(...assignmentResult.issues);
    candidatePlans.push(
      buildCandidatePlan({
        candidate,
        assignment: assignmentResult.assignment,
        profile: input.profile,
        deliveryDate: input.promptPackage.deliveryDate,
        parseResult: input.parseResult,
      })
    );
  }

  const status =
    candidatePlans.length === 0
      ? "blocked"
      : rejectedCandidateIds.length > 0 || omittedCandidateIds.length > 0
        ? "partial"
        : "built";

  return {
    status,
    deliveryDate: input.promptPackage.deliveryDate,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    planningFingerprint: input.promptPackage.planningFingerprint.planningFingerprint,
    candidatePlans,
    omittedCandidateIds: uniqueInOriginalOrder(omittedCandidateIds),
    rejectedCandidateIds: uniqueInOriginalOrder(rejectedCandidateIds),
    issues,
    warnings: collectWarnings(issues),
  };
}

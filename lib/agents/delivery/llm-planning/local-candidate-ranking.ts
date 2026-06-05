import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { buildMeetupCandidatePool } from "@/lib/agents/delivery/candidate-plans/rank-meetup-options";
import type {
  CandidatePlan,
  CandidatePlanStop,
  PlanningStop,
} from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

export const DELIVERY_AGENT_LLM_LOCAL_RANKING_VERSION =
  "delivery-agent-llm-local-ranking-v1" as const;

export const DEFAULT_DELIVERY_AGENT_LLM_LOCAL_FINALIST_LIMIT = 3 as const;
export const DEFAULT_DELIVERY_AGENT_LLM_LOCAL_MIN_PREFERRED_SCORE = 60 as const;

export type DeliveryAgentLlmLocalCandidateRankingStatus =
  | "selected"
  | "partial"
  | "fallback_selected"
  | "blocked";

export type DeliveryAgentLlmLocalCandidateStatus =
  | "preferred"
  | "low_score"
  | "blocked";

export type DeliveryAgentLlmLocalScoreKey =
  | "orderCoverage"
  | "runSlotFit"
  | "areaPatternFit"
  | "sameAddressGrouping"
  | "driverBalance"
  | "selfDiscipline"
  | "handoffReadiness"
  | "coordinateCoverage";

export type DeliveryAgentLlmLocalScoreBreakdownItem = {
  key: DeliveryAgentLlmLocalScoreKey;
  label: string;
  weight: number;
  points: number;
  reason: string;
};

export type DeliveryAgentLlmLocalCandidateRanking = {
  candidatePlan: CandidatePlan;
  candidateId: string;
  status: DeliveryAgentLlmLocalCandidateStatus;
  rank: number;
  score: number;
  previewPriorityScore: number;
  eligibleForPreferredPreview: boolean;
  scoreBreakdown: DeliveryAgentLlmLocalScoreBreakdownItem[];
  blockingIssues: string[];
  warnings: string[];
};

export type DeliveryAgentLlmLocalCandidateRankingResult = {
  rankingVersion: typeof DELIVERY_AGENT_LLM_LOCAL_RANKING_VERSION;
  status: DeliveryAgentLlmLocalCandidateRankingStatus;
  rankedCandidates: DeliveryAgentLlmLocalCandidateRanking[];
  finalistCandidates: CandidatePlan[];
  finalistCandidateIds: string[];
  omittedCandidateIds: string[];
  blockedCandidateIds: string[];
  warnings: string[];
};

export type RankDeliveryAgentLlmLocalCandidatePlansInput = {
  candidatePlans: CandidatePlan[];
  profile: DeliveryPlanningProfile;
  expectedOrderIds?: string[];
  maxFinalists?: number;
  minPreferredScore?: number;
  includeLowScoreFallback?: boolean;
};

const LOCAL_SCORE_LABELS: Record<DeliveryAgentLlmLocalScoreKey, string> = {
  orderCoverage: "Order coverage",
  runSlotFit: "Run slot fit",
  areaPatternFit: "Area pattern fit",
  sameAddressGrouping: "Same-address grouping",
  driverBalance: "Driver balance",
  selfDiscipline: "Self discipline",
  handoffReadiness: "Handoff readiness",
  coordinateCoverage: "Coordinate coverage",
};

const LOCAL_SCORE_WEIGHTS: Record<DeliveryAgentLlmLocalScoreKey, number> = {
  orderCoverage: 100,
  runSlotFit: 85,
  areaPatternFit: 90,
  sameAddressGrouping: 55,
  driverBalance: 45,
  selfDiscipline: 75,
  handoffReadiness: 70,
  coordinateCoverage: 35,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBreakdownItem(
  key: DeliveryAgentLlmLocalScoreKey,
  points: number,
  reason: string
): DeliveryAgentLlmLocalScoreBreakdownItem {
  return {
    key,
    label: LOCAL_SCORE_LABELS[key],
    weight: LOCAL_SCORE_WEIGHTS[key],
    points: Math.round(clamp(points, 0, 100)),
    reason,
  };
}

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
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

function setDifferenceInOriginalOrder(left: string[], right: Set<string>): string[] {
  return uniqueInOriginalOrder(left.filter((value) => !right.has(value)));
}

function collectCandidateStops(candidate: CandidatePlan): Array<{
  runSlot: string;
  role: string;
  stop: CandidatePlanStop;
}> {
  return candidate.runs.flatMap((run) =>
    run.stops.map((stop) => ({
      runSlot: run.runSlot,
      role: run.role,
      stop,
    }))
  );
}

function toPlanningStopFromCandidateStop(stop: CandidatePlanStop): PlanningStop {
  return toPlanningStop({
    orderId: stop.orderId,
    mongoId: "",
    customerName: stop.customerName,
    customerPhone: "",
    customerEmail: "",
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    deliveryAddress: {
      unitNumber: "",
      streetAddress: stop.formattedAddress,
      city: "",
      province: "",
      postalCode: "",
      country: "",
      buzzCode: "",
    },
    notes: "",
    specialInstructions: "",
    deliveryDate: "",
    deliveryWindow: "",
    mealSummary: "",
    totalMealQuantity: stop.totalMealQuantity,
    items: [],
    status: "confirmed",
    hasAdminOverride: false,
    lat: stop.lat,
    lng: stop.lng,
    routeOptimizer: {
      name: stop.customerName,
      phone: "",
      address: stop.formattedAddress,
      notes: "",
      order_ids: [stop.orderId],
      lat: stop.lat,
      lng: stop.lng,
    },
  } as RoutingStop);
}

function expectedLeanForRunSlot(runSlot: string): "dt" | "marco" | null {
  if (runSlot === "A") {
    return "dt";
  }

  if (runSlot === "B") {
    return "marco";
  }

  return null;
}

function stopMatchesRunSlot(stop: CandidatePlanStop, runSlot: string): boolean {
  const expectedLean = expectedLeanForRunSlot(runSlot);
  if (!expectedLean) {
    return true;
  }

  const planningStop = toPlanningStopFromCandidateStop(stop);

  if (planningStop.areaBucket === "core_dt") {
    return expectedLean === "dt";
  }

  if (planningStop.areaBucket === "core_uptown") {
    return expectedLean === "marco";
  }

  return planningStop.defaultRunLean === expectedLean;
}

function normalizeAddressForGrouping(address: string): string {
  return address
    .toLowerCase()
    .replace(/\b(unit|suite|apt|apartment|ph|floor|fl)\s*#?\s*[a-z0-9-]+/gi, "")
    .replace(/#\s*[a-z0-9-]+/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreOrderCoverage(
  candidate: CandidatePlan,
  expectedOrderIds?: string[]
): {
  item: DeliveryAgentLlmLocalScoreBreakdownItem;
  blockingIssues: string[];
} {
  const allStops = collectCandidateStops(candidate);
  const orderIds = allStops.map((entry) => entry.stop.orderId);
  const duplicates = detectDuplicates(orderIds);
  const expectedDuplicates = expectedOrderIds ? detectDuplicates(expectedOrderIds) : [];
  const blockingIssues: string[] = [];

  if (orderIds.length === 0) {
    blockingIssues.push("Candidate has no assigned stops.");
  }

  if (expectedDuplicates.length > 0) {
    blockingIssues.push(
      `Expected order list contains duplicate order IDs: ${expectedDuplicates.join(", ")}.`
    );
  }

  if (duplicates.length > 0) {
    blockingIssues.push(`Candidate assigns duplicate order IDs: ${duplicates.join(", ")}.`);
  }

  if (expectedOrderIds) {
    const assignedOrderIdSet = new Set(orderIds);
    const expectedOrderIdSet = new Set(expectedOrderIds);
    const missingOrderIds = setDifferenceInOriginalOrder(expectedOrderIds, assignedOrderIdSet);
    const unexpectedOrderIds = setDifferenceInOriginalOrder(orderIds, expectedOrderIdSet);

    if (missingOrderIds.length > 0) {
      blockingIssues.push(
        `Candidate is missing expected order IDs: ${missingOrderIds.join(", ")}.`
      );
    }

    if (unexpectedOrderIds.length > 0) {
      blockingIssues.push(
        `Candidate includes unexpected order IDs: ${unexpectedOrderIds.join(", ")}.`
      );
    }
  }

  if (candidate.summary.totalStops !== orderIds.length) {
    blockingIssues.push(
      `Candidate summary totalStops ${candidate.summary.totalStops} does not match assigned stop count ${orderIds.length}.`
    );
  }

  return {
    item: buildBreakdownItem(
      "orderCoverage",
      blockingIssues.length === 0 ? 100 : 0,
      blockingIssues.length === 0
        ? expectedOrderIds
          ? `${orderIds.length}/${expectedOrderIds.length} expected order(s) assigned exactly once.`
          : `${orderIds.length} assigned order(s), all unique.`
        : blockingIssues.join(" ")
    ),
    blockingIssues,
  };
}

function scoreRunSlotFit(input: {
  candidate: CandidatePlan;
  profile: DeliveryPlanningProfile;
}): { item: DeliveryAgentLlmLocalScoreBreakdownItem; blockingIssues: string[]; warnings: string[] } {
  const profileRunSlots = new Set(input.profile.drivers.map((driver) => driver.runSlot));
  const runSlots = input.candidate.runs.map((run) => run.runSlot);
  const unknownRunSlots = runSlots.filter((runSlot) => !profileRunSlots.has(runSlot));
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (
    input.candidate.profileId !== input.profile.profileId ||
    input.candidate.profileVersion !== input.profile.profileVersion
  ) {
    blockingIssues.push("Candidate planning profile does not match the active profile.");
  }

  if (unknownRunSlots.length > 0) {
    blockingIssues.push(`Candidate uses unknown run slot(s): ${unknownRunSlots.join(", ")}.`);
  }

  const runA = input.candidate.runs.find((run) => run.runSlot === "A");
  const runB = input.candidate.runs.find((run) => run.runSlot === "B");
  if (!runA || !runB) {
    blockingIssues.push("Candidate must include Run A and Run B before local ranking.");
  } else if (runA.stopCount === 0 || runB.stopCount === 0) {
    warnings.push("One hired run has no stops; this may be valid only on very small or unusual days.");
  }

  return {
    item: buildBreakdownItem(
      "runSlotFit",
      blockingIssues.length > 0 ? 0 : warnings.length > 0 ? 78 : 100,
      blockingIssues.length > 0
        ? blockingIssues.join(" ")
        : warnings.length > 0
          ? warnings.join(" ")
          : "Run slots match the active profile."
    ),
    blockingIssues,
    warnings,
  };
}

function scoreAreaPatternFit(candidate: CandidatePlan): DeliveryAgentLlmLocalScoreBreakdownItem {
  const evaluatedStops = collectCandidateStops(candidate).filter(
    (entry) => entry.runSlot === "A" || entry.runSlot === "B"
  );

  if (evaluatedStops.length === 0) {
    return buildBreakdownItem("areaPatternFit", 0, "No hired-driver stops to evaluate.");
  }

  const matched = evaluatedStops.filter((entry) =>
    stopMatchesRunSlot(entry.stop, entry.runSlot)
  ).length;
  const points = (matched / evaluatedStops.length) * 100;

  return buildBreakdownItem(
    "areaPatternFit",
    points,
    `${matched}/${evaluatedStops.length} hired-driver stop(s) match the expected local area pattern.`
  );
}

function scoreSameAddressGrouping(candidate: CandidatePlan): {
  item: DeliveryAgentLlmLocalScoreBreakdownItem;
  warnings: string[];
} {
  const groups = new Map<string, Array<{ orderId: string; runSlot: string }>>();

  for (const entry of collectCandidateStops(candidate)) {
    const key = normalizeAddressForGrouping(entry.stop.formattedAddress);
    if (!key) {
      continue;
    }

    const group = groups.get(key) ?? [];
    group.push({ orderId: entry.stop.orderId, runSlot: entry.runSlot });
    groups.set(key, group);
  }

  const splitGroups = [...groups.values()].filter((group) => {
    if (group.length <= 1) {
      return false;
    }

    return new Set(group.map((entry) => entry.runSlot)).size > 1;
  });

  if (splitGroups.length === 0) {
    return {
      item: buildBreakdownItem("sameAddressGrouping", 100, "Same-address stops stay together."),
      warnings: [],
    };
  }

  const warnings = splitGroups.map(
    (group) =>
      `Same-address order group split across runs: ${group.map((entry) => entry.orderId).join(", ")}.`
  );
  const multiStopGroupCount = [...groups.values()].filter((group) => group.length > 1).length;
  const points = clamp(100 - (splitGroups.length / Math.max(multiStopGroupCount, 1)) * 70, 30, 100);

  return {
    item: buildBreakdownItem("sameAddressGrouping", points, warnings.join(" ")),
    warnings,
  };
}

function scoreDriverBalance(candidate: CandidatePlan): DeliveryAgentLlmLocalScoreBreakdownItem {
  const runA = candidate.runs.find((run) => run.runSlot === "A");
  const runB = candidate.runs.find((run) => run.runSlot === "B");
  const totalStops = candidate.summary.totalStops;

  if (!runA || !runB) {
    return buildBreakdownItem("driverBalance", 0, "Run A or Run B is missing.");
  }

  if (runA.stopCount === 0 || runB.stopCount === 0) {
    return buildBreakdownItem(
      "driverBalance",
      totalStops <= 2 ? 72 : 45,
      `Run A has ${runA.stopCount} stop(s), Run B has ${runB.stopCount} stop(s).`
    );
  }

  const stopRatio = Math.min(runA.stopCount, runB.stopCount) / Math.max(runA.stopCount, runB.stopCount);
  const mealRatio =
    Math.min(runA.totalMealQuantity, runB.totalMealQuantity) /
    Math.max(runA.totalMealQuantity, runB.totalMealQuantity, 1);
  const points = stopRatio * 70 + mealRatio * 30;

  return buildBreakdownItem(
    "driverBalance",
    points,
    `Run A ${runA.stopCount} stop(s) / ${runA.totalMealQuantity} meal(s), Run B ${runB.stopCount} stop(s) / ${runB.totalMealQuantity} meal(s).`
  );
}

function scoreSelfDiscipline(input: {
  candidate: CandidatePlan;
  profile: DeliveryPlanningProfile;
}): { item: DeliveryAgentLlmLocalScoreBreakdownItem; warnings: string[] } {
  if (!input.candidate.summary.selfUsed) {
    return {
      item: buildBreakdownItem("selfDiscipline", 100, "Self is not used."),
      warnings: [],
    };
  }

  const selfStopCount = input.candidate.summary.selfStopCount;
  const maxPreferredStops = input.profile.selfFallbackRules.maxPreferredStops;
  const warnings: string[] = [
    `Self is used for ${selfStopCount} stop(s); this should stay backup-only.`,
  ];

  if (selfStopCount > maxPreferredStops) {
    warnings.push(
      `Self stop count is above the preferred maximum ${maxPreferredStops}.`
    );
  }

  const points =
    selfStopCount > maxPreferredStops
      ? clamp(45 - (selfStopCount - maxPreferredStops) * 15, 15, 45)
      : clamp(85 - selfStopCount * 18, 35, 85);

  return {
    item: buildBreakdownItem("selfDiscipline", points, warnings.join(" ")),
    warnings,
  };
}

function scoreHandoffReadiness(input: {
  candidate: CandidatePlan;
  profile: DeliveryPlanningProfile;
}): { item: DeliveryAgentLlmLocalScoreBreakdownItem; warnings: string[] } {
  if (!input.profile.handoffRules.enabled) {
    return {
      item: buildBreakdownItem("handoffReadiness", 100, "Handoff is disabled for this profile."),
      warnings: [],
    };
  }

  const providerRun = input.candidate.runs.find(
    (run) => run.runSlot === input.profile.handoffRules.providerRunSlot
  );
  const receiverRun = input.candidate.runs.find((run) =>
    input.profile.handoffRules.receiverRunSlots.includes(run.runSlot)
  );
  const warnings: string[] = [];

  if (!providerRun || !receiverRun || providerRun.stopCount === 0 || receiverRun.stopCount === 0) {
    warnings.push("Provider or receiver run is empty, so handoff proof may be weak.");
    return {
      item: buildBreakdownItem("handoffReadiness", 45, warnings.join(" ")),
      warnings,
    };
  }

  const pool = buildMeetupCandidatePool(input.candidate.runs, input.profile);
  if (pool.length === 0) {
    warnings.push("No local North York-like stop is available as a handoff source.");
    return {
      item: buildBreakdownItem("handoffReadiness", 45, warnings.join(" ")),
      warnings,
    };
  }

  const bestTier = pool.some((candidate) => candidate.sourceTier === "run_a_north_york")
    ? "run_a_north_york"
    : pool.some((candidate) => candidate.sourceTier === "flexible_north_york")
      ? "flexible_north_york"
      : "fallback";
  const points =
    bestTier === "run_a_north_york" ? 100 : bestTier === "flexible_north_york" ? 82 : 62;

  return {
    item: buildBreakdownItem(
      "handoffReadiness",
      points,
      `${pool.length} local handoff source candidate(s); best source tier: ${bestTier}.`
    ),
    warnings,
  };
}

function scoreCoordinateCoverage(candidate: CandidatePlan): {
  item: DeliveryAgentLlmLocalScoreBreakdownItem;
  warnings: string[];
} {
  const stops = collectCandidateStops(candidate);
  const withCoordinates = stops.filter(
    (entry) => typeof entry.stop.lat === "number" && typeof entry.stop.lng === "number"
  ).length;
  const coverage = stops.length > 0 ? withCoordinates / stops.length : 0;
  const warnings =
    coverage < 0.75
      ? [`Only ${withCoordinates}/${stops.length} stop(s) have coordinates before local ranking.`]
      : [];

  return {
    item: buildBreakdownItem(
      "coordinateCoverage",
      coverage * 100,
      `${withCoordinates}/${stops.length} stop(s) have coordinates.`
    ),
    warnings,
  };
}

function computeWeightedScore(items: DeliveryAgentLlmLocalScoreBreakdownItem[]): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const item of items) {
    if (item.weight <= 0) {
      continue;
    }

    weighted += item.weight * item.points;
    totalWeight += item.weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((weighted / totalWeight) * 10) / 10;
}

function scoreLocalCandidate(input: {
  candidate: CandidatePlan;
  profile: DeliveryPlanningProfile;
  expectedOrderIds?: string[];
  minPreferredScore: number;
}): Omit<DeliveryAgentLlmLocalCandidateRanking, "rank"> {
  const scoreItems: DeliveryAgentLlmLocalScoreBreakdownItem[] = [];
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  const orderCoverage = scoreOrderCoverage(input.candidate, input.expectedOrderIds);
  scoreItems.push(orderCoverage.item);
  blockingIssues.push(...orderCoverage.blockingIssues);

  const runSlotFit = scoreRunSlotFit(input);
  scoreItems.push(runSlotFit.item);
  blockingIssues.push(...runSlotFit.blockingIssues);
  warnings.push(...runSlotFit.warnings);

  scoreItems.push(scoreAreaPatternFit(input.candidate));

  const sameAddressGrouping = scoreSameAddressGrouping(input.candidate);
  scoreItems.push(sameAddressGrouping.item);
  warnings.push(...sameAddressGrouping.warnings);

  scoreItems.push(scoreDriverBalance(input.candidate));

  const selfDiscipline = scoreSelfDiscipline(input);
  scoreItems.push(selfDiscipline.item);
  warnings.push(...selfDiscipline.warnings);

  const handoffReadiness = scoreHandoffReadiness(input);
  scoreItems.push(handoffReadiness.item);
  warnings.push(...handoffReadiness.warnings);

  const coordinateCoverage = scoreCoordinateCoverage(input.candidate);
  scoreItems.push(coordinateCoverage.item);
  warnings.push(...coordinateCoverage.warnings);

  const hasVeryWeakCoreDimension = scoreItems.some(
    (item) =>
      (item.key === "areaPatternFit" || item.key === "handoffReadiness") && item.points < 45
  );
  if (hasVeryWeakCoreDimension) {
    warnings.push("One core local quality dimension is very weak; preview only if needed.");
  }

  const score = blockingIssues.length > 0 ? 0 : computeWeightedScore(scoreItems);
  const eligibleForPreferredPreview =
    blockingIssues.length === 0 && score >= input.minPreferredScore;
  const status: DeliveryAgentLlmLocalCandidateStatus =
    blockingIssues.length > 0
      ? "blocked"
      : eligibleForPreferredPreview
        ? "preferred"
        : "low_score";

  return {
    candidatePlan: input.candidate,
    candidateId: input.candidate.candidateId,
    status,
    score,
    previewPriorityScore: Math.round(score * 100),
    eligibleForPreferredPreview,
    scoreBreakdown: scoreItems,
    blockingIssues: uniqueInOriginalOrder(blockingIssues),
    warnings: uniqueInOriginalOrder(warnings),
  };
}

function compareRankings(
  left: Omit<DeliveryAgentLlmLocalCandidateRanking, "rank">,
  right: Omit<DeliveryAgentLlmLocalCandidateRanking, "rank">
): number {
  const statusRank: Record<DeliveryAgentLlmLocalCandidateStatus, number> = {
    preferred: 0,
    low_score: 1,
    blocked: 2,
  };
  const statusDelta = statusRank[left.status] - statusRank[right.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const leftSelf = left.candidatePlan.summary.selfUsed ? 1 : 0;
  const rightSelf = right.candidatePlan.summary.selfUsed ? 1 : 0;
  if (leftSelf !== rightSelf) {
    return leftSelf - rightSelf;
  }

  return left.candidateId.localeCompare(right.candidateId);
}

function selectFinalists(input: {
  ranked: DeliveryAgentLlmLocalCandidateRanking[];
  maxFinalists: number;
  includeLowScoreFallback: boolean;
}): { finalists: DeliveryAgentLlmLocalCandidateRanking[]; usedLowScoreFallback: boolean } {
  if (input.maxFinalists <= 0) {
    return { finalists: [], usedLowScoreFallback: false };
  }

  const preferred = input.ranked.filter((entry) => entry.status === "preferred");
  const lowScore = input.ranked.filter((entry) => entry.status === "low_score");

  if (preferred.length === 0) {
    return {
      finalists: input.includeLowScoreFallback ? lowScore.slice(0, 1) : [],
      usedLowScoreFallback: input.includeLowScoreFallback && lowScore.length > 0,
    };
  }

  const selected: DeliveryAgentLlmLocalCandidateRanking[] = [];
  const selectedIds = new Set<string>();
  const add = (entry: DeliveryAgentLlmLocalCandidateRanking | undefined) => {
    if (!entry || selected.length >= input.maxFinalists || selectedIds.has(entry.candidateId)) {
      return;
    }

    selected.push(entry);
    selectedIds.add(entry.candidateId);
  };

  add(preferred[0]);

  const hasSelfInPool = preferred.some((entry) => entry.candidatePlan.summary.selfUsed);
  if (input.maxFinalists >= 3 && hasSelfInPool) {
    add(preferred.find((entry) => entry.candidatePlan.summary.selfUsed));
  }

  for (const entry of preferred) {
    add(entry);
  }

  return { finalists: selected, usedLowScoreFallback: false };
}

export function rankDeliveryAgentLlmLocalCandidatePlans(
  input: RankDeliveryAgentLlmLocalCandidatePlansInput
): DeliveryAgentLlmLocalCandidateRankingResult {
  const maxFinalists = Math.max(
    0,
    input.maxFinalists ?? DEFAULT_DELIVERY_AGENT_LLM_LOCAL_FINALIST_LIMIT
  );
  const minPreferredScore = Math.max(
    0,
    input.minPreferredScore ?? DEFAULT_DELIVERY_AGENT_LLM_LOCAL_MIN_PREFERRED_SCORE
  );
  const includeLowScoreFallback = input.includeLowScoreFallback ?? true;

  const unranked = input.candidatePlans.map((candidate) =>
    scoreLocalCandidate({
      candidate,
      profile: input.profile,
      expectedOrderIds: input.expectedOrderIds,
      minPreferredScore,
    })
  );
  const rankedCandidates = [...unranked]
    .sort(compareRankings)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  const finalistSelection = selectFinalists({
    ranked: rankedCandidates,
    maxFinalists,
    includeLowScoreFallback,
  });
  const finalistIds = new Set(
    finalistSelection.finalists.map((entry) => entry.candidateId)
  );
  const blockedCandidateIds = rankedCandidates
    .filter((entry) => entry.status === "blocked")
    .map((entry) => entry.candidateId);
  const omittedCandidateIds = rankedCandidates
    .filter((entry) => !finalistIds.has(entry.candidateId))
    .map((entry) => entry.candidateId);
  const warnings: string[] = [];

  if (input.candidatePlans.length === 0) {
    warnings.push("No local LLM-generated candidate plans were available to rank.");
  }

  if (maxFinalists === 0 && input.candidatePlans.length > 0) {
    warnings.push("Local finalist limit is zero; no candidate will continue to paid preview.");
  }

  if (finalistSelection.usedLowScoreFallback) {
    warnings.push(
      "No candidate met the preferred local score threshold; selected the best low-score candidate as a warning-only fallback."
    );
  }

  if (omittedCandidateIds.length > 0) {
    warnings.push(
      `${omittedCandidateIds.length} local candidate(s) were not selected for paid preview.`
    );
  }

  const status: DeliveryAgentLlmLocalCandidateRankingStatus =
    finalistSelection.finalists.length === 0
      ? "blocked"
      : finalistSelection.usedLowScoreFallback
        ? "fallback_selected"
        : omittedCandidateIds.length > 0
          ? "partial"
          : "selected";

  return {
    rankingVersion: DELIVERY_AGENT_LLM_LOCAL_RANKING_VERSION,
    status,
    rankedCandidates,
    finalistCandidates: finalistSelection.finalists.map((entry) => entry.candidatePlan),
    finalistCandidateIds: finalistSelection.finalists.map((entry) => entry.candidateId),
    omittedCandidateIds,
    blockedCandidateIds,
    warnings: uniqueInOriginalOrder([
      ...warnings,
      ...rankedCandidates.flatMap((entry) => entry.warnings),
    ]),
  };
}

import { getDeliveryAgentLlmCallPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { buildDeliveryAgentPlanningFingerprint } from "@/lib/agents/delivery/llm-planning/planning-fingerprint";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";
import type {
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
} from "@/lib/contracts/delivery-agent-cost-policy";
import {
  DELIVERY_AGENT_DAILY_CANDIDATE_PROMPT_VERSION,
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  DELIVERY_AGENT_LLM_PROMPT_PACKAGE_VERSION,
  type DeliveryAgentCompactHistoricalPackage,
  type DeliveryAgentLlmPlanningScope,
  type DeliveryAgentLlmPromptCostControls,
  type DeliveryAgentLlmPromptHardRule,
  type DeliveryAgentLlmPromptInputObject,
  type DeliveryAgentLlmPromptMessage,
  type DeliveryAgentLlmPromptOrderFact,
  type DeliveryAgentLlmPromptOrderSummary,
  type DeliveryAgentLlmPromptOutputContract,
  type DeliveryAgentLlmPromptPackage,
  type DeliveryAgentLlmPromptPlanningProfile,
  type DeliveryAgentPlanningFingerprintFeedback,
  type DeliveryAgentPlanningFingerprintHistoricalPackage,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

const DELIVERY_AGENT_HARD_RULES_VERSION = "delivery-agent-hard-rules-v1";
const MAX_ADDRESS_HINT_LENGTH = 96;

const SYSTEM_PROMPT = [
  "You are Kapioo's delivery planning assistant for Donald.",
  "You create candidate delivery split ideas only; local code and Route Optimizer must prove any plan before it can be recommended.",
  "Use orderId values as the source of truth. Do not use customer identity for planning.",
  "Return JSON only, matching the requested output contract.",
].join(" ");

export type BuildDeliveryAgentLlmPromptPackageInput = {
  scope?: DeliveryAgentLlmPlanningScope;
  callType?: DeliveryAgentLlmCallType;
  deliveryDate: string;
  promptVersion?: string;
  profile: DeliveryPlanningProfile;
  orders: DeliveryAgentPlanningFingerprintOrderFact[];
  historicalPackage?: DeliveryAgentCompactHistoricalPackage;
  policy: DeliveryAgentCostPolicy;
  feedback?: DeliveryAgentPlanningFingerprintFeedback;
  localCandidateSeedHash?: string;
  previousFailureHash?: string;
};

function compactString(value: string | undefined, maxLength: number): string | undefined {
  const compact = value?.trim().replace(/\s+/g, " ");
  if (!compact) {
    return undefined;
  }

  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1).trim()}...` : compact;
}

function sanitizeAddressHint(value: string | undefined): string | undefined {
  const withoutUnit = value
    ?.replace(/\b(?:unit|suite|apt|apartment|room|rm)\s*#?\s*[A-Za-z0-9-]+/gi, "")
    .replace(/#\s*[A-Za-z0-9-]+/g, "")
    .replace(/\s+,/g, ",");

  return compactString(withoutUnit, MAX_ADDRESS_HINT_LENGTH);
}

function normalizeCoordinate(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Number(value.toFixed(6));
}

function normalizeText(value: string | undefined): string | undefined {
  return compactString(value, 120);
}

function normalizeTags(values: string[] | undefined): string[] | undefined {
  const tags = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );

  return tags.length > 0 ? tags : undefined;
}

function buildPromptOrders(
  orders: DeliveryAgentPlanningFingerprintOrderFact[]
): DeliveryAgentLlmPromptOrderFact[] {
  return orders
    .map((order) => ({
      orderId: order.orderId,
      status: order.status,
      area: normalizeText(order.area),
      addressHint: sanitizeAddressHint(order.formattedAddress),
      totalMealQuantity: order.totalMealQuantity,
      lat: normalizeCoordinate(order.lat),
      lng: normalizeCoordinate(order.lng),
      coordinateConfidence: normalizeText(order.coordinateConfidence),
      coordinateSource: normalizeText(order.coordinateSource),
      planningTags: normalizeTags(order.planningTags),
    }))
    .sort((left, right) => left.orderId.localeCompare(right.orderId));
}

function incrementCounter(counter: Record<string, number>, rawKey: string | undefined): void {
  const key = rawKey?.trim() || "unknown";
  counter[key] = (counter[key] ?? 0) + 1;
}

function buildOrderSummary(
  orders: DeliveryAgentLlmPromptOrderFact[]
): DeliveryAgentLlmPromptOrderSummary {
  const byArea: Record<string, number> = {};
  const planningTagCounts: Record<string, number> = {};
  const ordersMissingCoordinates: string[] = [];

  for (const order of orders) {
    incrementCounter(byArea, order.area);

    for (const tag of order.planningTags ?? []) {
      incrementCounter(planningTagCounts, tag);
    }

    if (typeof order.lat !== "number" || typeof order.lng !== "number") {
      ordersMissingCoordinates.push(order.orderId);
    }
  }

  const coordinateCoveragePercent =
    orders.length > 0
      ? Math.round(((orders.length - ordersMissingCoordinates.length) / orders.length) * 1000) / 10
      : 0;

  return {
    orderCount: orders.length,
    byArea,
    coordinateCoveragePercent,
    ordersMissingCoordinates,
    planningTagCounts,
  };
}

function buildPromptProfile(
  profile: DeliveryPlanningProfile
): DeliveryAgentLlmPromptPlanningProfile {
  return {
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    name: profile.name,
    timezone: profile.timeRules.timezone,
    normalKitchenStartTime: profile.timeRules.normalKitchenStartTime,
    earliestKitchenStartTime: profile.timeRules.earliestKitchenStartTime,
    hardDeliveryDeadline: profile.timeRules.hardDeliveryDeadline,
    preferredDeadlineBufferMinutes: profile.timeRules.preferredDeadlineBufferMinutes,
    drivers: profile.drivers.map((driver) => ({
      runSlot: driver.runSlot,
      role: driver.role,
      startsFrom: driver.startsFrom,
      preferredEndRole: driver.preferredEndRole,
      isBackupOnly: driver.isBackupOnly,
    })),
    handoff: {
      enabled: profile.handoffRules.enabled,
      providerRunSlot: profile.handoffRules.providerRunSlot,
      receiverRunSlots: [...profile.handoffRules.receiverRunSlots],
      serviceTimeMinutes: profile.handoffRules.serviceTimeMinutes,
      allowStopsBeforeMeetup: profile.handoffRules.allowStopsBeforeMeetup,
      maxStopsBeforeMeetup: profile.handoffRules.maxStopsBeforeMeetup,
      preferredHandoffZoneLabel:
        profile.handoffRules.meetupSelectionPreferences.preferredHandoffZoneLabel,
    },
    selfFallback: {
      enabled: profile.selfFallbackRules.enabled,
      backupOnly: true,
      maxPreferredStops: profile.selfFallbackRules.maxPreferredStops,
      preferMinimumStops: profile.selfFallbackRules.preferMinimumStops,
    },
  };
}

function buildHardRules(profile: DeliveryPlanningProfile): DeliveryAgentLlmPromptHardRule[] {
  const providerRunSlot = profile.handoffRules.providerRunSlot;
  const receiverRunSlots = profile.handoffRules.receiverRunSlots.join(", ");

  return [
    {
      code: "ALL_ORDERS_EXACTLY_ONCE",
      severity: "must",
      rule: "Every provided orderId must appear in exactly one candidate run. No duplicates and no missing orders.",
    },
    {
      code: "NO_INVENTED_ORDER_IDS",
      severity: "must",
      rule: "Do not create, rename, or infer order IDs. Use only the orderIds in the input.",
    },
    {
      code: "DEADLINE_1PM",
      severity: "must",
      rule: `Plans must aim to finish before ${profile.timeRules.hardDeliveryDeadline} ${profile.timeRules.timezone}.`,
    },
    {
      code: "PREFERRED_BUFFER",
      severity: "should",
      rule: `Prefer at least ${profile.timeRules.preferredDeadlineBufferMinutes} minutes of buffer before the hard deadline.`,
    },
    {
      code: "LOCATION_FIRST",
      severity: "must",
      rule: "Use coordinates and route shape first; area labels are helper metadata only.",
    },
    {
      code: "TWO_HIRED_DRIVERS_FIRST",
      severity: "should",
      rule: "Prefer a two-hired-driver solution when it can meet the deadline safely.",
    },
    {
      code: "SELF_BACKUP_ONLY",
      severity: "must",
      rule: "Use Self only when hired drivers cannot safely finish; if used, assign the fewest practical stops to Self.",
    },
    {
      code: "HANDOFF_LOGIC",
      severity: "must",
      rule: `When handoff is needed, run ${providerRunSlot} provides meals and receiver run(s) ${receiverRunSlots} start from the handoff.`,
    },
    {
      code: "NO_UNPROVEN_RECOMMENDATION",
      severity: "must",
      rule: "Do not claim a candidate is proven or recommended. Route Optimizer proof happens after this LLM step.",
    },
    {
      code: "NO_ROUTE_OPTIMIZER_SEARCH",
      severity: "must",
      rule: "Do not ask for many Route Optimizer previews. Create a small number of serious candidate ideas only.",
    },
    {
      code: "HISTORY_USE",
      severity: "should",
      rule: "Use positive historical cases as examples and avoid-pattern cases as warnings. Keep those concepts separate.",
    },
    {
      code: "OUTPUT_JSON_ONLY",
      severity: "must",
      rule: "Return only valid JSON. No markdown and no explanatory prose outside JSON.",
    },
  ];
}

function buildOutputContract(): DeliveryAgentLlmPromptOutputContract {
  return {
    outputSchemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    responseFormat: "json_object",
    requiredTopLevelFields: [
      "schemaVersion",
      "summary",
      "candidates",
      "unprovenIdeas",
      "hardRuleChecklist",
      "warnings",
    ],
    candidateRequiredFields: [
      "candidateId",
      "strategyName",
      "reasoningSummary",
      "runs",
      "handoffPlan",
      "selfUse",
      "risks",
      "historicalCaseIdsUsed",
    ],
    hardRuleChecklistRequired: true,
    instructions: [
      "Each candidate run must contain runSlot and orderIds.",
      "candidateId must be stable and lowercase, using letters, numbers, underscores, or dashes.",
      "handoffPlan may suggest a handoff strategy or source orderIds, but exact proof is deferred to local/RO validation.",
      "unprovenIdeas are allowed only as warning-only ideas, never as the recommended plan.",
      "If a hard rule cannot be satisfied, explain the blocker in warnings and do not pretend the plan is usable.",
    ],
  };
}

function buildCostControls(
  policy: DeliveryAgentCostPolicy,
  callType: DeliveryAgentLlmCallType
): DeliveryAgentLlmPromptCostControls {
  const callPolicy = getDeliveryAgentLlmCallPolicy(policy, callType);

  return {
    policyVersion: policy.policyVersion,
    modelRoutingPolicyVersion: policy.modelRoutingPolicyVersion,
    callType,
    modelTier: callPolicy.modelTier,
    maxInputTokens: callPolicy.maxInputTokens,
    maxOutputTokens: callPolicy.maxOutputTokens,
    maxAttemptsPerPlanningSession: callPolicy.maxAttemptsPerPlanningSession,
    cacheable: callPolicy.cacheable,
    maxDetailedHistoricalCases: policy.historicalPrompt.maxDetailedHistoricalCases,
    maxCompactHistoricalLessons: policy.historicalPrompt.maxCompactHistoricalLessons,
    maxRawHistoricalCasesInPrompt: policy.historicalPrompt.maxRawHistoricalCasesInPrompt,
  };
}

function buildPlanningGuidance(input: {
  profile: DeliveryPlanningProfile;
  historicalPackage?: DeliveryAgentCompactHistoricalPackage;
  feedback?: DeliveryAgentPlanningFingerprintFeedback;
}): string[] {
  const guidance = [
    "Generate only a small set of high-quality candidate split ideas; local preview budget is limited.",
    "Prefer preserving Donald's working split patterns unless today's geography or deadline pressure makes that unsafe.",
    "Keep Midtown, Downtown, and near-kitchen North York-like stops together when geography supports it.",
    "Keep Markham and Richmond Hill together unless evidence suggests the current day needs a different split.",
    "Use Self as rescue support only; if Self appears, explain why two hired drivers were not enough.",
  ];

  if (input.historicalPackage && input.historicalPackage.selectedCaseIds.length > 0) {
    guidance.push(
      `Use compact historical cases: ${input.historicalPackage.selectedCaseIds.join(", ")}.`
    );
  }

  if (input.feedback?.feedbackText) {
    guidance.push("Donald rejected a previous plan; prioritize the structured feedback in this prompt.");
  }

  if (!input.profile.learningSettings.allowHistoricalPatternSuggestions) {
    guidance.push("Historical patterns are disabled for this profile; use hard rules and current orders only.");
  }

  return guidance;
}

function buildHistoricalPackageFingerprintRef(
  historicalPackage: DeliveryAgentCompactHistoricalPackage | undefined
): DeliveryAgentPlanningFingerprintHistoricalPackage | undefined {
  if (!historicalPackage) {
    return undefined;
  }

  return {
    packageVersion: historicalPackage.packageVersion,
    retrievalHash: historicalPackage.retrievalHash,
    selectedCaseIds: historicalPackage.selectedCaseIds,
    compactLessonHash: historicalPackage.compactLessonHash,
  };
}

function estimateTokensFromText(value: string): number {
  return Math.ceil(value.length / 4);
}

function estimateOutputTokens(input: {
  orderCount: number;
  maxOutputTokens: number;
}): number {
  if (input.maxOutputTokens === 0) {
    return 0;
  }

  const estimate = 900 + input.orderCount * 35;
  return Math.min(input.maxOutputTokens, estimate);
}

function buildWarnings(input: {
  policy: DeliveryAgentCostPolicy;
  costControls: DeliveryAgentLlmPromptCostControls;
  promptInput: DeliveryAgentLlmPromptInputObject;
  estimatedInputTokens: number;
}): string[] {
  const warnings: string[] = [];

  if (input.policy.mode !== "normal") {
    warnings.push(`LLM policy mode is ${input.policy.mode}; this prompt package must not be sent automatically.`);
  }

  if (input.estimatedInputTokens > input.costControls.maxInputTokens) {
    warnings.push(
      `Estimated input tokens ${input.estimatedInputTokens} exceed call limit ${input.costControls.maxInputTokens}.`
    );
  }

  if (input.costControls.maxRawHistoricalCasesInPrompt > 0) {
    warnings.push("Cost policy allows raw historical cases, but this prompt package uses compact history only.");
  }

  if (input.promptInput.orderSummary.ordersMissingCoordinates.length > 0) {
    warnings.push(
      `${input.promptInput.orderSummary.ordersMissingCoordinates.length} order(s) are missing coordinates.`
    );
  }

  if (!input.promptInput.historicalPackage) {
    warnings.push("No compact historical package was included.");
  }

  return warnings;
}

export function buildDeliveryAgentLlmPromptPackage(
  input: BuildDeliveryAgentLlmPromptPackageInput
): DeliveryAgentLlmPromptPackage {
  const scope = input.scope ?? "daily_generation";
  const callType = input.callType ?? "daily_candidate_generation";
  const promptVersion = input.promptVersion ?? DELIVERY_AGENT_DAILY_CANDIDATE_PROMPT_VERSION;
  const promptOrders = buildPromptOrders(input.orders);
  const promptProfile = buildPromptProfile(input.profile);
  const costControls = buildCostControls(input.policy, callType);
  const outputContract = buildOutputContract();
  const planningFingerprint = buildDeliveryAgentPlanningFingerprint({
    scope,
    deliveryDate: input.deliveryDate,
    promptVersion,
    hardRulesVersion: DELIVERY_AGENT_HARD_RULES_VERSION,
    costPolicyVersion: input.policy.policyVersion,
    modelRoutingPolicyVersion: input.policy.modelRoutingPolicyVersion,
    profile: {
      profileId: input.profile.profileId,
      profileVersion: input.profile.profileVersion,
      resourceProfileVersion: input.profile.profileVersion,
      planningRulesVersion: DELIVERY_AGENT_HARD_RULES_VERSION,
    },
    orders: input.orders,
    historicalPackage: buildHistoricalPackageFingerprintRef(input.historicalPackage),
    localCandidateSeedHash: input.localCandidateSeedHash,
    previousFailureHash: input.previousFailureHash,
    feedback: input.feedback,
  });

  const promptInput: DeliveryAgentLlmPromptInputObject = {
    objective:
      "Create a small set of candidate delivery split ideas for local validation. Do not recommend a final plan.",
    scope,
    deliveryDate: input.deliveryDate,
    profile: promptProfile,
    orders: promptOrders,
    orderSummary: buildOrderSummary(promptOrders),
    historicalPackage: input.historicalPackage,
    feedback: input.feedback,
    localCandidateSeedHash: input.localCandidateSeedHash,
    previousFailureHash: input.previousFailureHash,
    hardRules: buildHardRules(input.profile),
    outputContract,
    costControls,
    planningGuidance: buildPlanningGuidance({
      profile: input.profile,
      historicalPackage: input.historicalPackage,
      feedback: input.feedback,
    }),
  };

  const messages: DeliveryAgentLlmPromptMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "Use this structured input to create candidate split ideas.",
        "Return JSON only.",
        JSON.stringify(promptInput, null, 2),
      ].join("\n\n"),
    },
  ];
  const estimatedInputTokens = estimateTokensFromText(JSON.stringify(messages));
  const estimatedOutputTokens = estimateOutputTokens({
    orderCount: promptOrders.length,
    maxOutputTokens: costControls.maxOutputTokens,
  });
  const warnings = buildWarnings({
    policy: input.policy,
    costControls,
    promptInput,
    estimatedInputTokens,
  });

  return {
    promptPackageVersion: DELIVERY_AGENT_LLM_PROMPT_PACKAGE_VERSION,
    promptVersion,
    outputSchemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    scope,
    callType,
    deliveryDate: input.deliveryDate,
    profileId: input.profile.profileId,
    profileVersion: input.profile.profileVersion,
    planningFingerprint,
    tokenEstimate: {
      estimatedInputTokens,
      maxInputTokens: costControls.maxInputTokens,
      estimatedOutputTokens,
      maxOutputTokens: costControls.maxOutputTokens,
      status:
        estimatedInputTokens <= costControls.maxInputTokens
          ? "within_limit"
          : "over_limit",
    },
    messages,
    promptInput,
    warnings,
  };
}

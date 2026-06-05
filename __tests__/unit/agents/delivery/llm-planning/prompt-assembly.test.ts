import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import {
  DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  DELIVERY_AGENT_LLM_PROMPT_PACKAGE_VERSION,
  deliveryAgentLlmPromptPackageSchema,
  type DeliveryAgentCompactHistoricalPackage,
  type DeliveryAgentPlanningFingerprintOrderFact,
} from "@/lib/contracts/delivery-agent-llm-planning";

type OrderWithPrivateFields = DeliveryAgentPlanningFingerprintOrderFact & {
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

const ORDERS: OrderWithPrivateFields[] = [
  {
    orderId: "DD-2002",
    status: "confirmed",
    area: "North York",
    formattedAddress: "5000 Yonge St Unit 1201, Toronto",
    totalMealQuantity: 2,
    lat: 43.766123456,
    lng: -79.414987654,
    coordinateSource: "delivery_agent_cache",
    coordinateConfidence: "high",
    planningTags: ["handoff_candidate", "north"],
    customerName: "Private Customer",
    customerPhone: "4375559999",
    notes: "Buzz private",
  },
  {
    orderId: "DD-2001",
    status: "confirmed",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    totalMealQuantity: 1,
    coordinateSource: "address_only",
    coordinateConfidence: "low",
    planningTags: ["downtown"],
  },
];

function buildHistoricalPackage(): DeliveryAgentCompactHistoricalPackage {
  return {
    packageVersion: DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
    deliveryDate: "2026-06-10",
    profileId: DEFAULT_DELIVERY_PLANNING_PROFILE.profileId,
    selectedCaseIds: ["positive-case", "avoid-case"],
    retrievalHash: "retrieval-hash",
    compactLessonHash: "lesson-hash",
    detailedCases: [
      {
        caseKey: "positive-case",
        deliveryDate: "2026-06-01",
        profileId: DEFAULT_DELIVERY_PLANNING_PROFILE.profileId,
        learningLabel: "positive",
        learningWeight: 0.9,
        dataQualityScore: 92,
        reviewStatus: "reviewed",
        profileCompatibilityForFuture: "same_profile",
        orderCount: 30,
        matchedOrderCount: 30,
        matchCoveragePercent: 100,
        coordinateCoveragePercent: 94,
        areaDistribution: {
          "Downtown Toronto": 10,
          "North York": 12,
        },
        sameBuildingClusterCount: 1,
        outlierSummary: ["Outlier DD-old far_north: 14km from center"],
        routeShape: {
          runCount: 2,
          supportRunUsed: false,
          selfRunUsed: false,
          kitchenStartRunCount: 1,
          handoffStartRunCount: 1,
          backtrackingRisk: "low",
          routeDirectionSmoothness: "good",
        },
        stopControls: {
          fixedStopsUsed: true,
          endStopsUsed: true,
          firstStopsUsed: true,
          handoffStopsUsed: true,
        },
        outcome: {
          runCompletedBefore1pm: true,
          deadlineBufferMinutes: 14,
          lateMinutes: 0,
          latenessAttribution: "on_time",
          routeWouldHaveMetDeadlineIfStartedOnTime: true,
        },
        resourceProfile: {
          runCountUsed: 2,
          hiredDriverRunCount: 2,
          availableRunCount: 2,
          supportAvailable: true,
          supportRunUsed: false,
          selfRunUsed: false,
          runRoles: ["kitchen_start_provider", "handoff_start_receiver"],
        },
        promptSafeLessons: ["Useful pattern: 2 hired runs, early North York handoff."],
        warnings: [],
      },
      {
        caseKey: "avoid-case",
        deliveryDate: "2026-06-02",
        profileId: DEFAULT_DELIVERY_PLANNING_PROFILE.profileId,
        learningLabel: "avoid_pattern",
        learningWeight: 0.8,
        dataQualityScore: 88,
        reviewStatus: "reviewed",
        profileCompatibilityForFuture: "same_profile",
        orderCount: 28,
        matchedOrderCount: 28,
        matchCoveragePercent: 100,
        coordinateCoveragePercent: 90,
        areaDistribution: {
          "Downtown Toronto": 8,
          "North York": 14,
        },
        sameBuildingClusterCount: 0,
        outlierSummary: [],
        routeShape: {
          runCount: 2,
          supportRunUsed: false,
          selfRunUsed: false,
          kitchenStartRunCount: 1,
          handoffStartRunCount: 1,
          backtrackingRisk: "high",
          routeDirectionSmoothness: "risky",
        },
        stopControls: {
          fixedStopsUsed: false,
          endStopsUsed: false,
          firstStopsUsed: false,
          handoffStopsUsed: true,
        },
        outcome: {
          runCompletedBefore1pm: false,
          deadlineBufferMinutes: -9,
          lateMinutes: 9,
          latenessAttribution: "route_problem",
          routeWouldHaveMetDeadlineIfStartedOnTime: false,
        },
        resourceProfile: {
          runCountUsed: 2,
          hiredDriverRunCount: 2,
          availableRunCount: 2,
          supportAvailable: true,
          supportRunUsed: false,
          selfRunUsed: false,
          runRoles: ["kitchen_start_provider", "handoff_start_receiver"],
        },
        promptSafeLessons: ["Avoid pattern: late handoff made receiver route risky."],
        warnings: [],
      },
    ],
    compactLessons: [
      "Useful pattern: 2 hired runs, early North York handoff.",
      "Avoid pattern: late handoff made receiver route risky.",
    ],
    omittedCaseCount: 0,
    warnings: [],
  };
}

describe("buildDeliveryAgentLlmPromptPackage", () => {
  it("builds a valid prompt package for daily candidate generation without calling an LLM", () => {
    const promptPackage = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy(),
    });

    expect(deliveryAgentLlmPromptPackageSchema.parse(promptPackage)).toEqual(promptPackage);
    expect(promptPackage.promptPackageVersion).toBe(DELIVERY_AGENT_LLM_PROMPT_PACKAGE_VERSION);
    expect(promptPackage.outputSchemaVersion).toBe(
      DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION
    );
    expect(promptPackage.callType).toBe("daily_candidate_generation");
    expect(promptPackage.planningFingerprint.cacheKeyBase).toContain("daily_generation");
    expect(promptPackage.messages).toHaveLength(2);
    expect(promptPackage.promptInput.hardRules.map((rule) => rule.code)).toEqual(
      expect.arrayContaining([
        "ALL_ORDERS_EXACTLY_ONCE",
        "NO_INVENTED_ORDER_IDS",
        "SELF_BACKUP_ONLY",
        "NO_UNPROVEN_RECOMMENDATION",
        "OUTPUT_JSON_ONLY",
      ])
    );
    expect(promptPackage.tokenEstimate.status).toBe("within_limit");
  });

  it("sanitizes order facts and does not include customer identity or unit details", () => {
    const promptPackage = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy(),
    });
    const serialized = JSON.stringify(promptPackage);

    expect(promptPackage.promptInput.orders.map((order) => order.orderId)).toEqual([
      "DD-2001",
      "DD-2002",
    ]);
    expect(promptPackage.promptInput.orders[1]).toEqual(
      expect.objectContaining({
        orderId: "DD-2002",
        addressHint: "5000 Yonge St, Toronto",
        lat: 43.766123,
        lng: -79.414988,
      })
    );
    expect(serialized).not.toContain("Private Customer");
    expect(serialized).not.toContain("4375559999");
    expect(serialized).not.toContain("Buzz private");
    expect(serialized).not.toContain("Unit 1201");
  });

  it("keeps compact history in the prompt and never includes raw historical snapshots", () => {
    const promptPackage = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy(),
    });
    const serialized = JSON.stringify(promptPackage);

    expect(promptPackage.promptInput.historicalPackage?.selectedCaseIds).toEqual([
      "positive-case",
      "avoid-case",
    ]);
    expect(promptPackage.promptInput.planningGuidance.join(" ")).toContain(
      "positive-case, avoid-case"
    );
    expect(serialized).not.toContain("adminOrdersSnapshot");
    expect(serialized).not.toContain("routeOptimizerRunsSnapshot");
    expect(serialized).not.toContain("matchedStops");
  });

  it("changes the planning fingerprint when rejection feedback changes", () => {
    const base = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy(),
    });
    const rejected = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      scope: "rejection_regeneration",
      callType: "rejection_candidate_regeneration",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy(),
      feedback: {
        rejectionAttemptNumber: 1,
        rejectedCandidateId: "candidate-a",
        rejectedPlanHash: "hash-a",
        feedbackText: "The handoff is too late. Move the North York meetup earlier.",
        feedbackTags: ["meetup_too_late"],
        sourceFeedbackReviewedAt: "2026-06-10T14:00:00.000Z",
      },
    });

    expect(rejected.planningFingerprint.orderSetHash).toBe(
      base.planningFingerprint.orderSetHash
    );
    expect(rejected.planningFingerprint.planningFingerprint).not.toBe(
      base.planningFingerprint.planningFingerprint
    );
    expect(rejected.promptInput.planningGuidance.join(" ")).toContain(
      "Donald rejected a previous plan"
    );
  });

  it("warns when policy mode disables automatic sending or token estimate exceeds the limit", () => {
    const promptPackage = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-10",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDERS,
      historicalPackage: buildHistoricalPackage(),
      policy: createDefaultDeliveryAgentCostPolicy({
        mode: "dry_run",
        callPolicies: {
          daily_candidate_generation: {
            maxInputTokens: 10,
          },
        },
      }),
    });

    expect(promptPackage.tokenEstimate.status).toBe("over_limit");
    expect(promptPackage.warnings).toEqual(
      expect.arrayContaining([
        "LLM policy mode is dry_run; this prompt package must not be sent automatically.",
      ])
    );
    expect(promptPackage.warnings.join(" ")).toContain("Estimated input tokens");
  });

  it("throws before a cacheable prompt can be built when order IDs are duplicated", () => {
    expect(() =>
      buildDeliveryAgentLlmPromptPackage({
        deliveryDate: "2026-06-10",
        profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
        orders: [ORDERS[0]!, { ...ORDERS[0]!, formattedAddress: "Different address" }],
        historicalPackage: buildHistoricalPackage(),
        policy: createDefaultDeliveryAgentCostPolicy(),
      })
    ).toThrow(/Duplicate orderId/);
  });
});

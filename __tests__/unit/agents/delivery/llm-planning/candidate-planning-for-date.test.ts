const {
  previewDeliveryOrdersForAgentMock,
  getEnrichedDeliveryOrdersForRoutingMock,
  loadHistoricalLearningCasesForRetrievalMock,
  buildSimilarCompactHistoricalPackageForDeliveryAgentMock,
} = vi.hoisted(() => ({
  previewDeliveryOrdersForAgentMock: vi.fn(),
  getEnrichedDeliveryOrdersForRoutingMock: vi.fn(),
  loadHistoricalLearningCasesForRetrievalMock: vi.fn(),
  buildSimilarCompactHistoricalPackageForDeliveryAgentMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/preview-delivery-orders", () => ({
  previewDeliveryOrdersForAgent: previewDeliveryOrdersForAgentMock,
}));

vi.mock("@/lib/agents/delivery/geocode", () => ({
  getEnrichedDeliveryOrdersForRouting: getEnrichedDeliveryOrdersForRoutingMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/similar-historical-package", () => ({
  loadHistoricalLearningCasesForRetrieval: loadHistoricalLearningCasesForRetrievalMock,
  buildSimilarCompactHistoricalPackageForDeliveryAgent:
    buildSimilarCompactHistoricalPackageForDeliveryAgentMock,
}));

import { clearDeliveryAgentLlmCandidateOutputCacheForTests } from "@/lib/agents/delivery/llm-planning/candidate-output-cache";
import { runDeliveryAgentLlmCandidatePlanningForDate } from "@/lib/agents/delivery/llm-planning/candidate-planning-for-date";
import { resolveDeliveryAgentLlmProviderRuntimeConfig } from "@/lib/agents/delivery/llm-planning/provider-readiness";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import { buildRoutingStop } from "@/__tests__/unit/agents/delivery/candidate-plans/test-fixtures";
import {
  DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
  DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
  type DeliveryAgentCompactHistoricalPackage,
  type DeliveryAgentLlmCandidateOutput,
} from "@/lib/contracts/delivery-agent-llm-planning";
import type { RoutingStop } from "@/lib/agents/delivery/types";

const NOW_MS = Date.parse("2026-06-16T10:00:00.000Z");
const EMPTY_PROVIDER_RUNTIME_CONFIG = resolveDeliveryAgentLlmProviderRuntimeConfig({});

function buildStops(): RoutingStop[] {
  return [
    buildRoutingStop({
      orderId: "DD-91000001",
      area: "Downtown Toronto",
      lat: 43.6487,
      lng: -79.3817,
    }),
    buildRoutingStop({
      orderId: "DD-91000002",
      area: "North York",
      streetAddress: "5000 Yonge St",
      postalCode: "M2N 7E9",
      lat: 43.7661,
      lng: -79.4149,
    }),
    buildRoutingStop({
      orderId: "DD-91000003",
      area: "Richmond Hill",
      streetAddress: "30 High Tech Rd",
      postalCode: "L4B 4L8",
    }),
  ];
}

function buildOrderPreview(
  overrides: Partial<Awaited<ReturnType<typeof previewDeliveryOrdersForAgentMock>>> = {}
) {
  return {
    deliveryDate: "2026-06-16",
    queriedAt: "2026-06-15T12:00:00.000Z",
    confirmed: {
      totalStops: 3,
      validStops: 3,
      invalidStops: 0,
      warningStops: 0,
      totalMealQuantity: 6,
      byArea: {
        "Downtown Toronto": 1,
        "North York": 1,
        "Richmond Hill": 1,
      },
      byStatus: { confirmed: 3 },
      stops: [],
      invalid: [],
      warnings: [],
    },
    pending: {
      count: 0,
      orders: [],
    },
    canContinueToPlanning: true,
    blockingReasons: [],
    notes: "Order preview only.",
    ...overrides,
  };
}

function buildRoutingResult(stops = buildStops()) {
  const routingData = {
    deliveryDate: "2026-06-16",
    profileId: "daily-default",
    queriedAt: "2026-06-15T12:00:00.000Z",
    timezone: "America/Toronto",
    summary: {
      totalOrders: stops.length,
      validStops: stops.length,
      invalidStops: 0,
      warningStops: 0,
      byArea: {
        "Downtown Toronto": 1,
        "North York": 1,
        "Richmond Hill": 1,
      },
      byStatus: { confirmed: stops.length },
      totalMealQuantity: 6,
    },
    stops,
    invalid: [],
    warnings: [],
    sourceOrderResultSummary: {
      orderCount: stops.length,
      excludedCount: 0,
      itemCount: stops.length,
      totalMealQuantity: 6,
      byStatus: { confirmed: stops.length },
      byArea: {},
    },
  };

  return {
    routing: routingData,
    coordinateCoverage: {
      coveragePercent: 100,
      coveredCount: stops.length,
      totalCount: stops.length,
      missingCount: 0,
      sourceBreakdown: {},
    },
    geocodeEnrichment: {
      coordinateCoverage: {
        coveragePercent: 100,
        coveredCount: stops.length,
        totalCount: stops.length,
        missingCount: 0,
        sourceBreakdown: {},
      },
      alerts: [],
      stats: { cached: stops.length, geocoded: 0, failed: 0, skipped: 0 },
    },
  };
}

function buildHistoricalPackage(
  selectedCaseIds: string[] = ["case-good"]
): DeliveryAgentCompactHistoricalPackage {
  return {
    packageVersion: DELIVERY_AGENT_COMPACT_HISTORICAL_PACKAGE_VERSION,
    deliveryDate: "2026-06-16",
    profileId: DEFAULT_DELIVERY_PLANNING_PROFILE.profileId,
    selectedCaseIds,
    retrievalHash: "retrieval-hash",
    compactLessonHash: "lesson-hash",
    detailedCases: [],
    compactLessons: selectedCaseIds.map((caseId) => `Lesson from ${caseId}.`),
    omittedCaseCount: 0,
    warnings: [],
  };
}

function setupHappyPath() {
  previewDeliveryOrdersForAgentMock.mockResolvedValue(buildOrderPreview());
  getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue(buildRoutingResult());
  loadHistoricalLearningCasesForRetrievalMock.mockResolvedValue([
    { caseKey: "case-good" },
  ]);
  buildSimilarCompactHistoricalPackageForDeliveryAgentMock.mockReturnValue({
    target: {},
    retrieval: { warnings: [] },
    historicalPackage: buildHistoricalPackage(),
    selectedLearningCases: [],
    warnings: [],
  });
}

describe("runDeliveryAgentLlmCandidatePlanningForDate", () => {
  beforeEach(() => {
    clearDeliveryAgentLlmCandidateOutputCacheForTests();
    vi.clearAllMocks();
  });

  it("prepares a real-date LLM planning request without calling a provider", async () => {
    setupHappyPath();

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: "2026-06-16",
      providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
      nowMs: NOW_MS,
    });

    expect(result.status).toBe("ready_for_provider");
    expect(result.provider.apiCallMade).toBe(false);
    expect(result.provider.allowProviderCall).toBe(false);
    expect(result.provider.modelConfigured).toBe(false);
    expect(result.liveCallGate.status).toBe("not_requested");
    expect(result.liveCallGate.liveCallAllowed).toBe(false);
    expect(result.liveCallGate.blockingReasons).toEqual(
      expect.arrayContaining(["model_not_configured", "provider_api_key_missing"])
    );
    expect(result.prompt?.hasHistoricalPackage).toBe(true);
    expect(result.prompt?.promptOrderCount).toBe(3);
    expect(result.orderSummary.ordersWithCoordinates).toBe(2);
    expect(result.orderSummary.ordersMissingCoordinates).toEqual(["DD-91000003"]);
    expect(result.historicalPackage.status).toBe("included");
    expect(result.historicalPackage.selectedCaseIds).toEqual(["case-good"]);
    expect(result.cache.readStatus).toBe("miss");
    expect(result.localCandidates.dryRunStatus).toBe("prompt_ready");
    expect(getEnrichedDeliveryOrdersForRoutingMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-16",
      profileId: DEFAULT_DELIVERY_PLANNING_PROFILE.profileId,
      statuses: ["confirmed"],
    });

    const similarInput =
      buildSimilarCompactHistoricalPackageForDeliveryAgentMock.mock.calls[0][0];
    expect(similarInput.orders[0]).toMatchObject({
      orderId: "DD-91000001",
      area: "Downtown Toronto",
      formattedAddress: expect.any(String),
    });
    expect(similarInput.orders[0]).not.toHaveProperty("customerName");
    expect(similarInput.orders[0]).not.toHaveProperty("customerPhone");
    expect(similarInput.orders[0]).not.toHaveProperty("customerEmail");
  });

  it("blocks before routing and history work when order preview is not plannable", async () => {
    previewDeliveryOrdersForAgentMock.mockResolvedValue(
      buildOrderPreview({
        canContinueToPlanning: false,
        blockingReasons: ["1 pending order(s) must be confirmed before planning."],
        pending: { count: 1, orders: [] },
      })
    );

    await expect(
      runDeliveryAgentLlmCandidatePlanningForDate({
        deliveryDate: "2026-06-16",
        providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
        nowMs: NOW_MS,
      })
    ).rejects.toBeInstanceOf(DeliveryAgentPlanningBlockedError);

    expect(getEnrichedDeliveryOrdersForRoutingMock).not.toHaveBeenCalled();
    expect(loadHistoricalLearningCasesForRetrievalMock).not.toHaveBeenCalled();
  });

  it("rechecks routing validity after preview in case the order set changed", async () => {
    setupHappyPath();
    const invalidRoutingBase = buildRoutingResult([]);
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue({
      ...invalidRoutingBase,
      routing: {
        ...invalidRoutingBase.routing,
        summary: {
          ...invalidRoutingBase.routing.summary,
          totalOrders: 1,
          invalidStops: 1,
        },
        invalid: [
          {
            orderId: "DD-91000004",
            errors: [{ code: "ROUTING_MISSING_PHONE", message: "Missing phone" }],
            warnings: [],
          },
        ],
      },
    });

    await expect(
      runDeliveryAgentLlmCandidatePlanningForDate({
        deliveryDate: "2026-06-16",
        providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
        nowMs: NOW_MS,
      })
    ).rejects.toBeInstanceOf(DeliveryAgentPlanningBlockedError);

    expect(loadHistoricalLearningCasesForRetrievalMock).not.toHaveBeenCalled();
  });

  it("continues without history when historical retrieval fails", async () => {
    setupHappyPath();
    loadHistoricalLearningCasesForRetrievalMock.mockRejectedValue(
      new Error("learning DB unavailable")
    );

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: "2026-06-16",
      providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
      nowMs: NOW_MS,
    });

    expect(result.status).toBe("ready_for_provider");
    expect(result.historicalPackage.status).toBe("unavailable");
    expect(result.prompt?.hasHistoricalPackage).toBe(false);
    expect(result.warnings.join(" ")).toContain("learning DB unavailable");
  });

  it("can skip similar history explicitly", async () => {
    setupHappyPath();

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: "2026-06-16",
      includeHistoricalPackage: false,
      providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
      nowMs: NOW_MS,
    });

    expect(result.historicalPackage.status).toBe("skipped");
    expect(result.prompt?.hasHistoricalPackage).toBe(false);
    expect(loadHistoricalLearningCasesForRetrievalMock).not.toHaveBeenCalled();
    expect(buildSimilarCompactHistoricalPackageForDeliveryAgentMock).not.toHaveBeenCalled();
  });

  it("blocks planning when any stop is missing coordinates after geocode enrichment", async () => {
    setupHappyPath();
    const withMissing = buildRoutingResult();
    getEnrichedDeliveryOrdersForRoutingMock.mockResolvedValue({
      ...withMissing,
      coordinateCoverage: {
        coveragePercent: 66,
        coveredCount: 2,
        totalCount: 3,
        missingCount: 1,
        sourceBreakdown: {},
      },
    });

    await expect(
      runDeliveryAgentLlmCandidatePlanningForDate({
        deliveryDate: "2026-06-16",
        providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
        nowMs: NOW_MS,
      })
    ).rejects.toBeInstanceOf(DeliveryAgentPlanningBlockedError);
  });

  it("returns undefined finalists when no provider call was made", async () => {
    setupHappyPath();

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: "2026-06-16",
      providerRuntimeConfig: EMPTY_PROVIDER_RUNTIME_CONFIG,
      nowMs: NOW_MS,
    });

    expect(result.localCandidates.dryRunStatus).toBe("prompt_ready");
    expect(result.localCandidates.finalistCandidateCount).toBe(0);
    expect(result.localCandidates.finalists).toBeUndefined();
  });

  it("populates finalists with run detail when a fake provider returns valid output", async () => {
    setupHappyPath();

    const fakeOutput: DeliveryAgentLlmCandidateOutput = {
      schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
      summary: {
        planningSummary: "Fake provider output for finalist test.",
        candidateCount: 1,
        assumptions: [],
      },
      candidates: [
        {
          candidateId: "test-plan-a",
          strategyName: "test plan A",
          reasoningSummary: "Two-run split.",
          runs: [
            { runSlot: "A", orderIds: ["DD-91000001"] },
            { runSlot: "B", orderIds: ["DD-91000002", "DD-91000003"] },
          ],
          handoffPlan: {
            required: true,
            providerRunSlot: "A",
            receiverRunSlot: "B",
            strategy: "Central North York meetup.",
            suggestedMeetupArea: "North York",
            sourceOrderIds: ["DD-91000001"],
          },
          selfUse: { used: false, orderIds: [], reason: undefined },
          risks: [],
          historicalCaseIdsUsed: [],
          expectedStrengths: [],
          warnings: [],
        },
      ],
      unprovenIdeas: [],
      hardRuleChecklist: {
        allOrdersAssignedExactlyOnce: true,
        noDuplicateOrderIds: true,
        noInventedOrderIds: true,
        selfUsedOnlyAsBackup: true,
        routeOptimizerNotUsedAsSearch: true,
        unprovenIdeasNotRecommended: true,
      },
      warnings: [],
    };

    const fakeProvider = vi.fn().mockResolvedValue({
      status: "called",
      reason: "fake_provider_responded",
      rawCandidateOutput: fakeOutput,
      modelTier: "strong",
      modelProvider: "deepseek",
      modelId: "deepseek-chat",
      inputTokens: 1000,
      outputTokens: 200,
    });

    const configuredRuntimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig({
      DELIVERY_AGENT_LLM_PROVIDER: "deepseek",
      DELIVERY_AGENT_LLM_STRONG_MODEL: "deepseek-chat",
      DEEPSEEK_API_KEY: "test-key",
      DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "14",
      DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "28",
    });

    const result = await runDeliveryAgentLlmCandidatePlanningForDate({
      deliveryDate: "2026-06-16",
      providerRuntimeConfig: configuredRuntimeConfig,
      allowProviderCall: true,
      provider: fakeProvider,
      nowMs: NOW_MS,
    });

    expect(result.provider.apiCallMade).toBe(true);
    expect(result.localCandidates.finalistCandidateCount).toBeGreaterThan(0);

    const finalists = result.localCandidates.finalists;
    expect(finalists).toBeDefined();
    expect(finalists).toHaveLength(result.localCandidates.finalistCandidateCount);

    const first = finalists![0];
    expect(first.strategyType).toBe("llm_generated");
    expect(first.runs).toHaveLength(2);
    expect(first.runs.find((r) => r.runSlot === "A")?.orderIds).toEqual(["DD-91000001"]);
    expect(first.runs.find((r) => r.runSlot === "B")?.orderIds).toEqual(
      expect.arrayContaining(["DD-91000002", "DD-91000003"])
    );
    expect(first.totalStops).toBeGreaterThan(0);
    expect(first.localScore).toBeGreaterThanOrEqual(0);
  });
});

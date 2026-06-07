const {
  runDeliveryAgentLlmCandidatePlanningCoreMock,
  previewCandidatePlansPipelineMock,
} = vi.hoisted(() => ({
  runDeliveryAgentLlmCandidatePlanningCoreMock: vi.fn(),
  previewCandidatePlansPipelineMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/llm-planning/candidate-planning-for-date", () => ({
  runDeliveryAgentLlmCandidatePlanningCore: runDeliveryAgentLlmCandidatePlanningCoreMock,
}));

vi.mock("@/lib/agents/delivery/candidate-plans/preview-candidate-plans", () => ({
  previewCandidatePlansPipeline: previewCandidatePlansPipelineMock,
}));

import { previewDeliveryAgentLlmCandidatesForDate } from "@/lib/agents/delivery/llm-planning/preview-llm-candidates-for-date";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import type { CandidatePlan } from "@/lib/agents/delivery/candidate-plans/types";

function buildFinalist(id: string): CandidatePlan {
  return {
    candidateId: id,
    name: `Plan ${id}`,
    description: "LLM generated",
    strategyType: "llm_generated",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    deliveryDate: "2026-06-07",
    runs: [],
    summary: {
      totalStops: 5,
      totalMeals: 8,
      runCount: 2,
      selfUsed: false,
      selfStopCount: 0,
      byRun: {},
      byArea: {},
      northYorkSplit: { dt: 2, marco: 3 },
      warnings: [],
    },
    warnings: [],
    assumptions: [],
    handoffPlan: {
      providerRunSlot: "A",
      receiverRunSlot: "B",
      mode: "synthetic_handoff_stop_later",
      note: "Handoff at North York.",
    },
    constraintPlan: { fixedStops: [], endPoint: null, repairActionsPlanned: [] },
  };
}

function buildLlmResponse(finalistCandidateCount = 2) {
  return {
    pipelineVersion: "v1",
    status: "provider_completed" as const,
    deliveryDate: "2026-06-07",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    orderSummary: {
      totalOrders: 10,
      validStops: 10,
      invalidStops: 0,
      pendingOrders: 0,
      ordersWithCoordinates: 10,
      ordersMissingCoordinates: [],
      coordinateCoveragePercent: 100,
      byArea: {},
    },
    historicalPackage: { status: "included" as const, selectedCaseIds: [], selectedCaseCount: 1, warningCount: 0 },
    prompt: undefined,
    cache: { readStatus: "miss" as const, writeStatus: "written" as const, decisionStatus: "enabled" as const, decisionReasons: [], ttlHours: 24 },
    provider: { allowProviderCall: true, apiCallMade: true, status: "called" as const, reason: "ok", modelTier: "strong", modelConfigured: true },
    liveCallGate: {
      gateVersion: "v1", status: "allowed" as const, readinessStatus: "ready" as const,
      liveCallRequested: true, liveCallAllowed: true, callType: "daily_candidate_generation",
      modelTier: "strong", modelConfigured: true, apiKeyConfigured: true, pricingConfigured: true,
      pricingVersion: "v1", estimatedInputTokens: 1000, estimatedOutputTokens: 500,
      estimatedTotalTokens: 1500, targetCents: 50, blockingReasons: [], warnings: [],
    },
    localCandidates: {
      dryRunStatus: "ranked" as const,
      candidatePlanCount: finalistCandidateCount,
      finalistCandidateCount,
      parsedAcceptedCandidateIds: [],
      parsedRejectedCandidateIds: [],
      finalistCandidateIds: [],
    },
    warnings: [],
    errors: [],
  };
}

function buildPreviewResponse() {
  return {
    deliveryDate: "2026-06-07",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    candidates: [],
    recommendedCandidateId: "llm:2026-06-07:candidate-a",
    recommendedPlanSummary: null,
    selectionNotes: "",
    selectionWarnings: [],
    notes: "",
    coordinateCoverage: { coveragePercent: 100, coveredCount: 10, totalCount: 10, missingCount: 0, sourceBreakdown: {} },
  };
}

describe("previewDeliveryAgentLlmCandidatesForDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls LLM core then preview pipeline with finalists as baseCandidates", async () => {
    const finalists = [buildFinalist("candidate-a"), buildFinalist("candidate-b")];
    runDeliveryAgentLlmCandidatePlanningCoreMock.mockResolvedValue({
      response: buildLlmResponse(2),
      finalistCandidates: finalists,
    });
    previewCandidatePlansPipelineMock.mockResolvedValue(buildPreviewResponse());

    const result = await previewDeliveryAgentLlmCandidatesForDate({
      deliveryDate: "2026-06-07",
      allowProviderCall: true,
    });

    expect(result.llmResult.status).toBe("provider_completed");
    expect(result.previewResult.recommendedCandidateId).toBe("llm:2026-06-07:candidate-a");

    expect(previewCandidatePlansPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryDate: "2026-06-07",
        baseCandidates: finalists,
        previewBudget: expect.objectContaining({ action: "llm_candidate_preview" }),
      })
    );
  });

  it("throws DeliveryAgentPlanningBlockedError when LLM produced no finalists", async () => {
    runDeliveryAgentLlmCandidatePlanningCoreMock.mockResolvedValue({
      response: buildLlmResponse(0),
      finalistCandidates: [],
    });

    await expect(
      previewDeliveryAgentLlmCandidatesForDate({
        deliveryDate: "2026-06-07",
        allowProviderCall: false,
      })
    ).rejects.toBeInstanceOf(DeliveryAgentPlanningBlockedError);

    expect(previewCandidatePlansPipelineMock).not.toHaveBeenCalled();
  });

  it("passes correlationId through to the preview pipeline", async () => {
    runDeliveryAgentLlmCandidatePlanningCoreMock.mockResolvedValue({
      response: buildLlmResponse(1),
      finalistCandidates: [buildFinalist("c")],
    });
    previewCandidatePlansPipelineMock.mockResolvedValue(buildPreviewResponse());

    await previewDeliveryAgentLlmCandidatesForDate({
      deliveryDate: "2026-06-07",
      correlationId: "my-correlation-id",
    });

    expect(previewCandidatePlansPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        previewBudget: expect.objectContaining({ correlationId: "my-correlation-id" }),
      })
    );
  });
});

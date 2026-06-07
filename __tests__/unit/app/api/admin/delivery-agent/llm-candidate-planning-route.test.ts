const {
  requireAdminMfaMock,
  runPlanningForDateMock,
  createProviderExecutorMock,
  providerExecutor,
} = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  runPlanningForDateMock: vi.fn(),
  createProviderExecutorMock: vi.fn(),
  providerExecutor: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/candidate-planning-for-date", () => ({
  runDeliveryAgentLlmCandidatePlanningForDate: runPlanningForDateMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/openai-compatible-provider", () => ({
  createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor: createProviderExecutorMock,
}));

import { POST } from "@/app/api/admin/delivery-agent/llm-candidate-planning/route";
import { buildJsonRequest } from "@/__tests__/helpers/request";
import type {
  DeliveryAgentLlmCandidatePlanningResponse,
  DeliveryAgentLlmCandidatePlanningFinalistSummary,
} from "@/lib/contracts/delivery-agent";

function buildActor() {
  return {
    user: {
      id: "admin-1",
      email: "donald@example.com",
    },
    role: "admin",
    sessionVersion: 1,
  };
}

function buildResponse(): DeliveryAgentLlmCandidatePlanningResponse {
  return {
    pipelineVersion: "delivery-agent-llm-candidate-planning-for-date-v1",
    status: "ready_for_provider",
    deliveryDate: "2026-06-16",
    profileId: "daily-v1-current-dt-marco-self",
    profileVersion: "daily-v1.0",
    planningFingerprint: "fingerprint",
    orderSummary: {
      totalOrders: 3,
      validStops: 3,
      invalidStops: 0,
      pendingOrders: 0,
      ordersWithCoordinates: 2,
      ordersMissingCoordinates: ["DD-1"],
      coordinateCoveragePercent: 66.7,
      byArea: { "North York": 3 },
    },
    historicalPackage: {
      status: "included",
      selectedCaseIds: ["case-good"],
      selectedCaseCount: 1,
      warningCount: 0,
    },
    prompt: {
      promptPackageVersion: "prompt-package-v1",
      promptVersion: "daily-candidate-v1",
      outputSchemaVersion: "candidate-output-v1",
      scope: "daily_generation",
      callType: "daily_candidate_generation",
      estimatedInputTokens: 2000,
      maxInputTokens: 35000,
      estimatedOutputTokens: 1000,
      maxOutputTokens: 5000,
      tokenStatus: "within_limit",
      messageCount: 2,
      promptOrderCount: 3,
      hasHistoricalPackage: true,
    },
    cache: {
      readStatus: "miss",
      writeStatus: "not_started",
      decisionStatus: "enabled",
      decisionReasons: [],
      ttlHours: 24,
      cacheKey: "cache-key",
    },
    provider: {
      allowProviderCall: false,
      apiCallMade: false,
      status: "not_allowed",
      reason: "allow_provider_call_false",
      modelTier: "strong",
      modelProvider: "unconfigured",
      modelId: "unconfigured-strong-model",
      modelConfigured: false,
    },
    liveCallGate: {
      gateVersion: "delivery-agent-llm-provider-readiness-v1",
      status: "not_requested",
      readinessStatus: "blocked",
      liveCallRequested: false,
      liveCallAllowed: false,
      callType: "daily_candidate_generation",
      modelTier: "strong",
      provider: "unconfigured",
      modelId: "unconfigured-strong-model",
      modelConfigured: false,
      apiKeyConfigured: false,
      apiKeyEnvVar: "OPENAI_API_KEY",
      pricingConfigured: false,
      pricingVersion: "delivery-agent-llm-pricing-env-v1",
      estimatedInputTokens: 2000,
      estimatedOutputTokens: 1000,
      estimatedTotalTokens: 3000,
      targetCents: 50,
      blockingReasons: ["model_not_configured"],
      warnings: ["Live LLM provider call was not requested for this Admin action."],
    },
    localCandidates: {
      dryRunStatus: "prompt_ready",
      candidatePlanCount: 0,
      finalistCandidateCount: 0,
      parsedAcceptedCandidateIds: [],
      parsedRejectedCandidateIds: [],
      finalistCandidateIds: [],
    },
    warnings: [],
    errors: [],
  };
}

describe("POST /api/admin/delivery-agent/llm-candidate-planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMfaMock.mockResolvedValue({
      actor: buildActor(),
      response: null,
    });
    runPlanningForDateMock.mockResolvedValue(buildResponse());
    createProviderExecutorMock.mockReturnValue(providerExecutor);
  });

  it("requires admin MFA and runs provider-free planning preparation", async () => {
    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        {
          deliveryDate: "2026-06-16",
          profileId: "daily-v1-current-dt-marco-self",
          includeHistoricalPackage: false,
          forceRefresh: true,
          allowProviderCall: false,
        }
      )
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.provider.apiCallMade).toBe(false);
    expect(runPlanningForDateMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-16",
      profileId: "daily-v1-current-dt-marco-self",
      includeHistoricalPackage: false,
      forceRefresh: true,
      allowProviderCall: false,
      provider: undefined,
    });
    expect(createProviderExecutorMock).not.toHaveBeenCalled();
  });

  it("rejects attempts to enable provider calls without explicit live dry-run confirmation", async () => {
    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        {
          deliveryDate: "2026-06-16",
          allowProviderCall: true,
        }
      )
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(runPlanningForDateMock).not.toHaveBeenCalled();
    expect(createProviderExecutorMock).not.toHaveBeenCalled();
  });

  it("allows an explicit live LLM dry-run request and injects the server provider executor", async () => {
    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        {
          deliveryDate: "2026-06-16",
          allowProviderCall: true,
          liveDryRunConfirmation: "LIVE_LLM_DRY_RUN",
        }
      )
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(createProviderExecutorMock).toHaveBeenCalledTimes(1);
    expect(runPlanningForDateMock).toHaveBeenCalledWith({
      deliveryDate: "2026-06-16",
      profileId: undefined,
      includeHistoricalPackage: undefined,
      forceRefresh: undefined,
      allowProviderCall: true,
      provider: providerExecutor,
    });
  });

  it("passes through finalists from the planning service in the response body", async () => {
    const finalists: DeliveryAgentLlmCandidatePlanningFinalistSummary[] = [
      {
        candidateId: "llm:2026-06-16:candidate-a",
        name: "LLM candidate A",
        strategyType: "llm_generated",
        localScore: 82,
        rank: 1,
        runs: [
          { runSlot: "A", driverName: "DT", orderIds: ["DD-1", "DD-2"], stopCount: 2, areaBreakdown: { "Downtown Toronto": 2 } },
          { runSlot: "B", driverName: "Marco", orderIds: ["DD-3"], stopCount: 1, areaBreakdown: { "North York": 1 } },
        ],
        usesHandoff: true,
        usesSelfRun: false,
        totalStops: 3,
        totalMeals: 4,
        blockingIssues: [],
        warnings: [],
      },
    ];

    runPlanningForDateMock.mockResolvedValue({
      ...buildResponse(),
      localCandidates: {
        ...buildResponse().localCandidates,
        finalistCandidateCount: 1,
        finalistCandidateIds: ["llm:2026-06-16:candidate-a"],
        dryRunStatus: "ranked",
        finalists,
      },
    });

    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        { deliveryDate: "2026-06-16" }
      )
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.localCandidates.finalists).toHaveLength(1);
    expect(json.data.localCandidates.finalists[0].candidateId).toBe("llm:2026-06-16:candidate-a");
    expect(json.data.localCandidates.finalists[0].runs).toHaveLength(2);
  });

  it("omits finalists field when service returns localCandidates without it", async () => {
    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        { deliveryDate: "2026-06-16" }
      )
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.localCandidates.finalists).toBeUndefined();
  });

  it("returns the admin auth response before parsing the body", async () => {
    requireAdminMfaMock.mockResolvedValue({
      actor: null,
      response: Response.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(
      buildJsonRequest(
        "http://localhost:3000/api/admin/delivery-agent/llm-candidate-planning",
        {
          deliveryDate: "2026-06-16",
        }
      )
    );

    expect(response.status).toBe(401);
    expect(runPlanningForDateMock).not.toHaveBeenCalled();
  });
});

const { requireAdminMfaMock, runPlanningForDateMock } = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  runPlanningForDateMock: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/candidate-planning-for-date", () => ({
  runDeliveryAgentLlmCandidatePlanningForDate: runPlanningForDateMock,
}));

import { POST } from "@/app/api/admin/delivery-agent/llm-candidate-planning/route";
import { buildJsonRequest } from "@/__tests__/helpers/request";
import type { DeliveryAgentLlmCandidatePlanningResponse } from "@/lib/contracts/delivery-agent";

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
    });
  });

  it("rejects attempts to enable provider calls through the admin route body", async () => {
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

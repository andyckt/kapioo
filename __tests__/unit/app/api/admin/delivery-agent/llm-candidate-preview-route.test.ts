const {
  requireAdminMfaMock,
  previewLlmCandidatesMock,
  createProviderExecutorMock,
  providerExecutor,
} = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  previewLlmCandidatesMock: vi.fn(),
  createProviderExecutorMock: vi.fn(),
  providerExecutor: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/preview-llm-candidates-for-date", () => ({
  previewDeliveryAgentLlmCandidatesForDate: previewLlmCandidatesMock,
}));

vi.mock("@/lib/agents/delivery/llm-planning/openai-compatible-provider", () => ({
  createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor: createProviderExecutorMock,
}));

import { POST } from "@/app/api/admin/delivery-agent/llm-candidate-preview/route";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import { buildJsonRequest } from "@/__tests__/helpers/request";

function buildActor() {
  return { user: { id: "admin-1", email: "donald@example.com" }, role: "admin", sessionVersion: 1 };
}

function buildResult() {
  return {
    llmResult: { status: "cache_hit", deliveryDate: "2026-06-07" },
    previewResult: { deliveryDate: "2026-06-07", profileId: "daily-v1-current-dt-marco-self", recommendedCandidateId: "llm:2026-06-07:candidate-a" },
  };
}

describe("POST /api/admin/delivery-agent/llm-candidate-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMfaMock.mockResolvedValue({ actor: buildActor(), response: null });
    previewLlmCandidatesMock.mockResolvedValue(buildResult());
    createProviderExecutorMock.mockReturnValue(providerExecutor);
  });

  it("requires admin MFA", async () => {
    requireAdminMfaMock.mockResolvedValue({
      actor: null,
      response: Response.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/admin/delivery-agent/llm-candidate-preview", {
        deliveryDate: "2026-06-07",
      })
    );

    expect(response.status).toBe(401);
    expect(previewLlmCandidatesMock).not.toHaveBeenCalled();
  });

  it("runs provider-free preview when allowProviderCall is false", async () => {
    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/admin/delivery-agent/llm-candidate-preview", {
        deliveryDate: "2026-06-07",
        allowProviderCall: false,
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(createProviderExecutorMock).not.toHaveBeenCalled();
    expect(previewLlmCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowProviderCall: false, provider: undefined })
    );
  });

  it("injects provider executor and requires liveDryRunConfirmation when allowProviderCall is true", async () => {
    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/admin/delivery-agent/llm-candidate-preview", {
        deliveryDate: "2026-06-07",
        allowProviderCall: true,
        liveDryRunConfirmation: "LIVE_LLM_DRY_RUN",
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(createProviderExecutorMock).toHaveBeenCalledTimes(1);
    expect(previewLlmCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowProviderCall: true, provider: providerExecutor })
    );
    expect(json.data.previewResult.recommendedCandidateId).toBe("llm:2026-06-07:candidate-a");
  });

  it("rejects allowProviderCall=true without liveDryRunConfirmation", async () => {
    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/admin/delivery-agent/llm-candidate-preview", {
        deliveryDate: "2026-06-07",
        allowProviderCall: true,
      })
    );

    expect(response.status).toBe(400);
    expect(previewLlmCandidatesMock).not.toHaveBeenCalled();
  });

  it("returns 409 when LLM produced no finalists", async () => {
    previewLlmCandidatesMock.mockRejectedValue(
      new DeliveryAgentPlanningBlockedError(["LLM planning produced no valid finalist plans."])
    );

    const response = await POST(
      buildJsonRequest("http://localhost:3000/api/admin/delivery-agent/llm-candidate-preview", {
        deliveryDate: "2026-06-07",
      })
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.blockingReasons).toContain("LLM planning produced no valid finalist plans.");
  });
});

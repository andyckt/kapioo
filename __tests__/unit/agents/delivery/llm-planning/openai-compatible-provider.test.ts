import { createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor } from "@/lib/agents/delivery/llm-planning/openai-compatible-provider";
import { resolveDeliveryAgentLlmProviderRuntimeConfig } from "@/lib/agents/delivery/llm-planning/provider-readiness";
import type { DeliveryAgentOpenAiCompatibleFetch } from "@/lib/agents/delivery/llm-planning/openai-compatible-provider";
import type { DeliveryAgentLlmCandidateProviderRequest } from "@/lib/agents/delivery/llm-planning/candidate-provider-adapter";
import { DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION } from "@/lib/contracts/delivery-agent-llm-planning";

function buildRuntimeConfig() {
  return resolveDeliveryAgentLlmProviderRuntimeConfig({
    DELIVERY_AGENT_LLM_PROVIDER: "deepseek",
    DELIVERY_AGENT_LLM_STRONG_MODEL: "deepseek-v4-pro",
    DEEPSEEK_API_KEY: "test-deepseek-key",
    DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "1",
    DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "2",
  });
}

function buildRequest(
  overrides: Partial<DeliveryAgentLlmCandidateProviderRequest> = {}
): DeliveryAgentLlmCandidateProviderRequest {
  return {
    promptPackage: {} as DeliveryAgentLlmCandidateProviderRequest["promptPackage"],
    callType: "daily_candidate_generation",
    modelProvider: "deepseek",
    modelId: "deepseek-v4-pro",
    messages: [
      { role: "system", content: "Return JSON only." },
      { role: "user", content: "Create candidates." },
    ],
    responseFormat: "json_object",
    maxInputTokens: 35000,
    maxOutputTokens: 5000,
    estimatedInputTokens: 2000,
    estimatedOutputTokens: 1000,
    cacheKey: {} as DeliveryAgentLlmCandidateProviderRequest["cacheKey"],
    planningFingerprint: "fingerprint",
    ...overrides,
  };
}

function buildCandidateOutput() {
  return {
    schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    summary: {
      planningSummary: "Mock live dry-run candidate output.",
      candidateCount: 0,
      assumptions: ["No final route was created."],
    },
    candidates: [],
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
}

describe("createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor", () => {
  it("calls DeepSeek through the OpenAI-compatible chat completions endpoint", async () => {
    const fetchFn = vi.fn<DeliveryAgentOpenAiCompatibleFetch>(async () =>
      new Response(
        JSON.stringify({
          id: "deepseek-request-1",
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(buildCandidateOutput()),
              },
            },
          ],
          usage: {
            prompt_tokens: 2100,
            completion_tokens: 700,
            total_tokens: 2800,
          },
        }),
        { status: 200 }
      )
    );
    const executor = createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor({
      runtimeConfig: buildRuntimeConfig(),
      env: { DEEPSEEK_API_KEY: "test-deepseek-key" },
      fetchFn,
    });

    const result = await executor(buildRequest());

    expect(result.providerRequestId).toBe("deepseek-request-1");
    expect(result.rawCandidateOutput).toMatchObject({
      schemaVersion: DELIVERY_AGENT_LLM_CANDIDATE_OUTPUT_SCHEMA_VERSION,
    });
    expect(result.usage).toEqual({
      inputTokens: 2100,
      outputTokens: 700,
      totalTokens: 2800,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer test-deepseek-key",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "deepseek-v4-pro",
      response_format: { type: "json_object" },
      max_tokens: 5000,
      stream: false,
    });
  });

  it("returns invalid JSON text as raw output so local parser can block it", async () => {
    const fetchFn = vi.fn<DeliveryAgentOpenAiCompatibleFetch>(async () =>
      new Response(
        JSON.stringify({
          id: "bad-json-request",
          choices: [
            {
              finish_reason: "stop",
              message: { content: "not json" },
            },
          ],
        }),
        { status: 200 }
      )
    );
    const executor = createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor({
      runtimeConfig: buildRuntimeConfig(),
      env: { DEEPSEEK_API_KEY: "test-deepseek-key" },
      fetchFn,
    });

    const result = await executor(buildRequest());

    expect(result.rawCandidateOutput).toBe("not json");
  });

  it("throws without making a request when the API key is missing", async () => {
    const fetchFn = vi.fn<DeliveryAgentOpenAiCompatibleFetch>();
    const executor = createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor({
      runtimeConfig: buildRuntimeConfig(),
      env: {},
      fetchFn,
    });

    await expect(executor(buildRequest())).rejects.toThrow("provider_api_key_missing");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws provider HTTP errors with provider message and without exposing the key", async () => {
    const fetchFn = vi.fn<DeliveryAgentOpenAiCompatibleFetch>(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "rate limit",
            type: "rate_limit_error",
          },
        }),
        { status: 429, statusText: "Too Many Requests" }
      )
    );
    const executor = createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor({
      runtimeConfig: buildRuntimeConfig(),
      env: { DEEPSEEK_API_KEY: "test-deepseek-key" },
      fetchFn,
    });

    let message = "";
    try {
      await executor(buildRequest());
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe("provider_http_429: rate limit");
    expect(message).not.toContain("test-deepseek-key");
  });

  it("honors an explicit tier base URL override", async () => {
    const runtimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig({
      DELIVERY_AGENT_LLM_PROVIDER: "deepseek",
      DELIVERY_AGENT_LLM_STRONG_MODEL: "deepseek-v4-pro",
      DELIVERY_AGENT_LLM_STRONG_BASE_URL: "https://example.test/v1",
      DEEPSEEK_API_KEY: "test-deepseek-key",
      DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "1",
      DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "2",
    });
    const fetchFn = vi.fn<DeliveryAgentOpenAiCompatibleFetch>(async () =>
      new Response(
        JSON.stringify({
          id: "custom-base-url",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(buildCandidateOutput()) },
            },
          ],
        }),
        { status: 200 }
      )
    );
    const executor = createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor({
      runtimeConfig,
      env: { DEEPSEEK_API_KEY: "test-deepseek-key" },
      fetchFn,
    });

    await executor(buildRequest());

    expect(fetchFn.mock.calls[0][0]).toBe("https://example.test/v1/chat/completions");
  });
});

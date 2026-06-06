import { createDefaultDeliveryAgentCostPolicy } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import {
  createDeliveryAgentCostPolicyWithProviderRuntime,
  resolveDeliveryAgentLlmLiveCallGate,
  resolveDeliveryAgentLlmProviderRuntimeConfig,
} from "@/lib/agents/delivery/llm-planning/provider-readiness";
import { DEFAULT_DELIVERY_PLANNING_PROFILE } from "@/lib/agents/delivery/planning-profile/default-profile";
import { buildDeliveryAgentLlmPromptPackage } from "@/lib/agents/delivery/llm-planning/prompt-assembly";
import { resolveDeliveryAgentModelForCall } from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import type { DeliveryAgentLlmProviderEnv } from "@/lib/agents/delivery/llm-planning/provider-readiness";
import type { DeliveryAgentPlanningFingerprintOrderFact } from "@/lib/contracts/delivery-agent-llm-planning";

const ORDER_FACTS: DeliveryAgentPlanningFingerprintOrderFact[] = [
  {
    orderId: "DD-9501",
    status: "confirmed",
    area: "Downtown Toronto",
    formattedAddress: "100 King St W, Toronto",
    lat: 43.6487,
    lng: -79.3817,
    totalMealQuantity: 1,
  },
  {
    orderId: "DD-9502",
    status: "confirmed",
    area: "North York",
    formattedAddress: "5000 Yonge St, Toronto",
    lat: 43.7661,
    lng: -79.4149,
    totalMealQuantity: 2,
  },
];

function buildPromptPackage(input: {
  env?: DeliveryAgentLlmProviderEnv;
  maxInputTokens?: number;
  maxOutputTokens?: number;
} = {}) {
  const runtimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig(input.env ?? {});
  const policy = createDeliveryAgentCostPolicyWithProviderRuntime({
    runtimeConfig,
    overrides: {
      callPolicies: {
        daily_candidate_generation: {
          maxInputTokens: input.maxInputTokens ?? 35000,
          maxOutputTokens: input.maxOutputTokens ?? 5000,
        },
      },
    },
  });

  return {
    runtimeConfig,
    policy,
    promptPackage: buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-16",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDER_FACTS,
      policy,
    }),
  };
}

describe("delivery-agent LLM provider readiness", () => {
  it("leaves models unconfigured when provider env is missing", () => {
    const runtimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig({});
    const policy = createDeliveryAgentCostPolicyWithProviderRuntime({
      runtimeConfig,
    });

    expect(policy.models.strong.configured).toBe(false);
    expect(policy.models.strong.provider).toBe("unconfigured");
    expect(runtimeConfig.tiers.strong.missing).toEqual(
      expect.arrayContaining([
        "DELIVERY_AGENT_LLM_STRONG_PROVIDER or DELIVERY_AGENT_LLM_PROVIDER",
        "DELIVERY_AGENT_LLM_STRONG_MODEL",
        "DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION",
        "DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION",
      ])
    );
  });

  it("configures the strong model from provider, model, key, and pricing env", () => {
    const runtimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig({
      DELIVERY_AGENT_LLM_PROVIDER: "openai",
      DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-test-model",
      OPENAI_API_KEY: "test-key",
      DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "25",
      DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "100",
    });
    const policy = createDeliveryAgentCostPolicyWithProviderRuntime({
      runtimeConfig,
    });

    expect(policy.models.strong).toEqual(
      expect.objectContaining({
        tier: "strong",
        provider: "openai",
        modelId: "strong-test-model",
        configured: true,
      })
    );
    expect(runtimeConfig.tiers.strong.apiKey).toEqual({
      configured: true,
      envVar: "OPENAI_API_KEY",
    });
    expect(runtimeConfig.tiers.strong.pricing).toMatchObject({
      inputCentsPerMillion: 25,
      outputCentsPerMillion: 100,
    });
  });

  it("blocks live calls when pricing is missing even if the model API key is configured", () => {
    const { runtimeConfig, policy, promptPackage } = buildPromptPackage({
      env: {
        DELIVERY_AGENT_LLM_PROVIDER: "openai",
        DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-test-model",
        OPENAI_API_KEY: "test-key",
      },
    });
    const gate = resolveDeliveryAgentLlmLiveCallGate({
      promptPackage,
      policy,
      modelResolution: resolveDeliveryAgentModelForCall(
        policy,
        "daily_candidate_generation"
      ),
      runtimeConfig,
      allowProviderCall: true,
    });

    expect(gate.status).toBe("blocked");
    expect(gate.liveCallAllowed).toBe(false);
    expect(gate.modelConfigured).toBe(true);
    expect(gate.blockingReasons).toEqual(
      expect.arrayContaining(["input_pricing_missing", "output_pricing_missing"])
    );
    expect(gate.estimatedCostCents).toBeUndefined();
  });

  it("allows a requested live call only when configured, priced, within target, and within token limit", () => {
    const { runtimeConfig, policy, promptPackage } = buildPromptPackage({
      env: {
        DELIVERY_AGENT_LLM_PROVIDER: "openai",
        DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-test-model",
        OPENAI_API_KEY: "test-key",
        DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "1",
        DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "2",
      },
    });
    const gate = resolveDeliveryAgentLlmLiveCallGate({
      promptPackage,
      policy,
      modelResolution: resolveDeliveryAgentModelForCall(
        policy,
        "daily_candidate_generation"
      ),
      runtimeConfig,
      allowProviderCall: true,
    });

    expect(gate.status).toBe("allowed");
    expect(gate.readinessStatus).toBe("ready");
    expect(gate.liveCallAllowed).toBe(true);
    expect(gate.estimatedCostCents).toBeGreaterThan(0);
    expect(gate.withinTarget).toBe(true);
    expect(gate.targetCents).toBe(50);
  });

  it("blocks a configured model when the estimated call cost exceeds Donald's normal target", () => {
    const { runtimeConfig, policy, promptPackage } = buildPromptPackage({
      env: {
        DELIVERY_AGENT_LLM_PROVIDER: "openai",
        DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-test-model",
        OPENAI_API_KEY: "test-key",
        DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "100000",
        DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "100000",
      },
    });
    const gate = resolveDeliveryAgentLlmLiveCallGate({
      promptPackage,
      policy,
      modelResolution: resolveDeliveryAgentModelForCall(
        policy,
        "daily_candidate_generation"
      ),
      runtimeConfig,
      allowProviderCall: true,
    });

    expect(gate.status).toBe("blocked");
    expect(gate.blockingReasons).toContain("estimated_llm_cost_over_target");
    expect(gate.withinTarget).toBe(false);
  });

  it("blocks when the prompt is over the call token limit", () => {
    const runtimeConfig = resolveDeliveryAgentLlmProviderRuntimeConfig({
      DELIVERY_AGENT_LLM_PROVIDER: "openai",
      DELIVERY_AGENT_LLM_STRONG_MODEL: "strong-test-model",
      OPENAI_API_KEY: "test-key",
      DELIVERY_AGENT_LLM_STRONG_INPUT_CENTS_PER_MILLION: "1",
      DELIVERY_AGENT_LLM_STRONG_OUTPUT_CENTS_PER_MILLION: "2",
    });
    const policy = createDeliveryAgentCostPolicyWithProviderRuntime({
      runtimeConfig,
      overrides: {
        callPolicies: {
          daily_candidate_generation: {
            maxInputTokens: 1,
          },
        },
      },
    });
    const promptPackage = buildDeliveryAgentLlmPromptPackage({
      deliveryDate: "2026-06-16",
      profile: DEFAULT_DELIVERY_PLANNING_PROFILE,
      orders: ORDER_FACTS,
      policy,
    });
    const gate = resolveDeliveryAgentLlmLiveCallGate({
      promptPackage,
      policy,
      modelResolution: resolveDeliveryAgentModelForCall(
        policy,
        "daily_candidate_generation"
      ),
      runtimeConfig,
      allowProviderCall: true,
    });

    expect(gate.status).toBe("blocked");
    expect(gate.blockingReasons).toContain("prompt_token_estimate_over_limit");
  });

  it("keeps default policy creation available for tests and non-LLM code", () => {
    const defaultPolicy = createDefaultDeliveryAgentCostPolicy();

    expect(defaultPolicy.models.strong.configured).toBe(false);
  });
});

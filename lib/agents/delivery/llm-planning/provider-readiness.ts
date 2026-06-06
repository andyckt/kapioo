import {
  createDefaultDeliveryAgentCostPolicy,
  type DeliveryAgentCostPolicyOverrides,
} from "@/lib/agents/delivery/cost-policy/delivery-agent-cost-policy";
import type {
  DeliveryAgentConfiguredModelTier,
  DeliveryAgentCostPolicy,
  DeliveryAgentLlmCallType,
  DeliveryAgentLlmModelResolution,
  DeliveryAgentModelRef,
} from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentLlmCandidatePlanningLiveCallGate,
  DeliveryAgentLlmCandidatePlanningLiveCallGateStatus,
} from "@/lib/contracts/delivery-agent";
import type { DeliveryAgentLlmPromptPackage } from "@/lib/contracts/delivery-agent-llm-planning";

export const DELIVERY_AGENT_LLM_PROVIDER_READINESS_VERSION =
  "delivery-agent-llm-provider-readiness-v1" as const;

export const DELIVERY_AGENT_LLM_PRICING_VERSION_ENV =
  "delivery-agent-llm-pricing-env-v1" as const;

const MODEL_TIERS: DeliveryAgentConfiguredModelTier[] = [
  "cheap",
  "strong",
  "rescue",
  "embedding",
];

const DEFAULT_PROVIDER_API_KEY_ENV: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY", "DELIVERY_AGENT_LLM_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY", "DELIVERY_AGENT_LLM_API_KEY"],
  gemini: [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "DELIVERY_AGENT_LLM_API_KEY",
  ],
  google: [
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "DELIVERY_AGENT_LLM_API_KEY",
  ],
  custom: ["DELIVERY_AGENT_LLM_API_KEY"],
};

export type DeliveryAgentLlmProviderEnv = Record<string, string | undefined>;

export type DeliveryAgentLlmProviderApiKeyReadiness = {
  configured: boolean;
  envVar?: string;
};

export type DeliveryAgentLlmProviderPricing = {
  pricingVersion: typeof DELIVERY_AGENT_LLM_PRICING_VERSION_ENV;
  inputCentsPerMillion?: number;
  outputCentsPerMillion?: number;
};

export type DeliveryAgentLlmProviderTierRuntimeConfig = {
  tier: DeliveryAgentConfiguredModelTier;
  provider?: string;
  modelId?: string;
  modelRef?: DeliveryAgentModelRef;
  apiKey: DeliveryAgentLlmProviderApiKeyReadiness;
  pricing: DeliveryAgentLlmProviderPricing;
  missing: string[];
  warnings: string[];
};

export type DeliveryAgentLlmProviderRuntimeConfig = {
  providerReadinessVersion: typeof DELIVERY_AGENT_LLM_PROVIDER_READINESS_VERSION;
  pricingVersion: typeof DELIVERY_AGENT_LLM_PRICING_VERSION_ENV;
  tiers: Record<DeliveryAgentConfiguredModelTier, DeliveryAgentLlmProviderTierRuntimeConfig>;
  warnings: string[];
};

export type CreateDeliveryAgentCostPolicyWithProviderRuntimeInput = {
  runtimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  env?: DeliveryAgentLlmProviderEnv;
  overrides?: DeliveryAgentCostPolicyOverrides;
};

export type ResolveDeliveryAgentLlmLiveCallGateInput = {
  promptPackage?: DeliveryAgentLlmPromptPackage;
  policy: DeliveryAgentCostPolicy;
  modelResolution: DeliveryAgentLlmModelResolution;
  runtimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  allowProviderCall: boolean;
};

function readEnv(input: {
  env: DeliveryAgentLlmProviderEnv;
  name: string;
}): string | undefined {
  const value = input.env[input.name]?.trim();
  return value || undefined;
}

function normalizeProvider(value: string | undefined): string | undefined {
  const provider = value?.trim().toLowerCase();
  return provider || undefined;
}

function tierEnvPrefix(tier: DeliveryAgentConfiguredModelTier): string {
  return `DELIVERY_AGENT_LLM_${tier.toUpperCase()}`;
}

function resolveApiKeyReadiness(input: {
  env: DeliveryAgentLlmProviderEnv;
  provider?: string;
}): DeliveryAgentLlmProviderApiKeyReadiness {
  if (!input.provider) {
    return { configured: false };
  }

  const candidates =
    DEFAULT_PROVIDER_API_KEY_ENV[input.provider] ?? DEFAULT_PROVIDER_API_KEY_ENV.custom;

  for (const envVar of candidates) {
    if (readEnv({ env: input.env, name: envVar })) {
      return { configured: true, envVar };
    }
  }

  return {
    configured: false,
    envVar: candidates[0],
  };
}

function readOptionalNonNegativeNumber(input: {
  env: DeliveryAgentLlmProviderEnv;
  name: string;
  warnings: string[];
}): number | undefined {
  const raw = readEnv({ env: input.env, name: input.name });
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    input.warnings.push(`${input.name} must be a non-negative number.`);
    return undefined;
  }

  return value;
}

function buildModelRef(input: {
  tier: DeliveryAgentConfiguredModelTier;
  provider?: string;
  modelId?: string;
  apiKeyConfigured: boolean;
}): DeliveryAgentModelRef | undefined {
  if (!input.provider || !input.modelId) {
    return undefined;
  }

  return {
    tier: input.tier,
    provider: input.provider,
    modelId: input.modelId,
    displayName: `${input.provider} ${input.modelId}`,
    pricingKey: `${input.provider}:${input.modelId}`,
    configured: input.apiKeyConfigured,
  };
}

function resolveTierRuntimeConfig(input: {
  env: DeliveryAgentLlmProviderEnv;
  tier: DeliveryAgentConfiguredModelTier;
}): DeliveryAgentLlmProviderTierRuntimeConfig {
  const prefix = tierEnvPrefix(input.tier);
  const warnings: string[] = [];
  const provider = normalizeProvider(
    readEnv({ env: input.env, name: `${prefix}_PROVIDER` }) ??
      readEnv({ env: input.env, name: "DELIVERY_AGENT_LLM_PROVIDER" })
  );
  const modelId = readEnv({ env: input.env, name: `${prefix}_MODEL` });
  const apiKey = resolveApiKeyReadiness({ env: input.env, provider });
  const pricing: DeliveryAgentLlmProviderPricing = {
    pricingVersion: DELIVERY_AGENT_LLM_PRICING_VERSION_ENV,
    inputCentsPerMillion: readOptionalNonNegativeNumber({
      env: input.env,
      name: `${prefix}_INPUT_CENTS_PER_MILLION`,
      warnings,
    }),
    outputCentsPerMillion: readOptionalNonNegativeNumber({
      env: input.env,
      name: `${prefix}_OUTPUT_CENTS_PER_MILLION`,
      warnings,
    }),
  };
  const missing: string[] = [];

  if (!provider) {
    missing.push(`${prefix}_PROVIDER or DELIVERY_AGENT_LLM_PROVIDER`);
  }

  if (!modelId) {
    missing.push(`${prefix}_MODEL`);
  }

  if (provider && !apiKey.configured) {
    missing.push(apiKey.envVar ?? "DELIVERY_AGENT_LLM_API_KEY");
  }

  if (pricing.inputCentsPerMillion === undefined) {
    missing.push(`${prefix}_INPUT_CENTS_PER_MILLION`);
  }

  if (pricing.outputCentsPerMillion === undefined && input.tier !== "embedding") {
    missing.push(`${prefix}_OUTPUT_CENTS_PER_MILLION`);
  }

  return {
    tier: input.tier,
    provider,
    modelId,
    modelRef: buildModelRef({
      tier: input.tier,
      provider,
      modelId,
      apiKeyConfigured: apiKey.configured,
    }),
    apiKey,
    pricing,
    missing,
    warnings,
  };
}

function roundCents(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function costCentsForTokens(input: {
  tokens: number;
  centsPerMillion?: number;
}): number | undefined {
  if (input.centsPerMillion === undefined) {
    return undefined;
  }

  return (input.tokens / 1_000_000) * input.centsPerMillion;
}

function callTargetCents(input: {
  policy: DeliveryAgentCostPolicy;
  callType: DeliveryAgentLlmCallType;
}): number {
  return input.callType === "rescue_support_planner"
    ? input.policy.costTargets.rescueDailyTargetCents
    : input.policy.costTargets.normalDailyTargetCents;
}

function uniqueInOriginalOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    output.push(value);
  }

  return output;
}

export function resolveDeliveryAgentLlmProviderRuntimeConfig(
  env: DeliveryAgentLlmProviderEnv = process.env
): DeliveryAgentLlmProviderRuntimeConfig {
  const tiers = MODEL_TIERS.reduce((acc, tier) => {
    acc[tier] = resolveTierRuntimeConfig({ env, tier });
    return acc;
  }, {} as Record<DeliveryAgentConfiguredModelTier, DeliveryAgentLlmProviderTierRuntimeConfig>);

  return {
    providerReadinessVersion: DELIVERY_AGENT_LLM_PROVIDER_READINESS_VERSION,
    pricingVersion: DELIVERY_AGENT_LLM_PRICING_VERSION_ENV,
    tiers,
    warnings: uniqueInOriginalOrder(MODEL_TIERS.flatMap((tier) => tiers[tier].warnings)),
  };
}

export function createDeliveryAgentCostPolicyWithProviderRuntime(
  input: CreateDeliveryAgentCostPolicyWithProviderRuntimeInput = {}
): DeliveryAgentCostPolicy {
  const runtimeConfig =
    input.runtimeConfig ?? resolveDeliveryAgentLlmProviderRuntimeConfig(input.env);
  const models = MODEL_TIERS.reduce((acc, tier) => {
    const modelRef = runtimeConfig.tiers[tier].modelRef;
    if (modelRef) {
      acc[tier] = modelRef;
    }
    return acc;
  }, {} as Partial<Record<DeliveryAgentConfiguredModelTier, DeliveryAgentModelRef>>);

  return createDefaultDeliveryAgentCostPolicy({
    ...input.overrides,
    models: {
      ...models,
      ...input.overrides?.models,
    },
  });
}

export function resolveDeliveryAgentLlmLiveCallGate(
  input: ResolveDeliveryAgentLlmLiveCallGateInput
): DeliveryAgentLlmCandidatePlanningLiveCallGate {
  const runtimeConfig =
    input.runtimeConfig ?? resolveDeliveryAgentLlmProviderRuntimeConfig();
  const modelTier = input.modelResolution.modelTier;
  const callType = input.promptPackage?.callType ?? input.modelResolution.callType;
  const tierRuntime =
    modelTier === "none"
      ? undefined
      : runtimeConfig.tiers[modelTier as DeliveryAgentConfiguredModelTier];
  const tokenEstimate = input.promptPackage?.tokenEstimate;
  const estimatedInputTokens = tokenEstimate?.estimatedInputTokens ?? 0;
  const estimatedOutputTokens = tokenEstimate?.estimatedOutputTokens ?? 0;
  const inputCostCents = costCentsForTokens({
    tokens: estimatedInputTokens,
    centsPerMillion: tierRuntime?.pricing.inputCentsPerMillion,
  });
  const outputCostCents =
    estimatedOutputTokens === 0
      ? 0
      : costCentsForTokens({
          tokens: estimatedOutputTokens,
          centsPerMillion: tierRuntime?.pricing.outputCentsPerMillion,
        });
  const estimatedCostCents =
    inputCostCents !== undefined && outputCostCents !== undefined
      ? roundCents(inputCostCents + outputCostCents)
      : undefined;
  const targetCents = callTargetCents({ policy: input.policy, callType });
  const withinTarget =
    estimatedCostCents === undefined ? undefined : estimatedCostCents <= targetCents;
  const blockingReasons: string[] = [];
  const warnings: string[] = [...runtimeConfig.warnings];

  if (!input.promptPackage) {
    blockingReasons.push("prompt_package_missing");
  }

  if (tokenEstimate?.status === "over_limit") {
    blockingReasons.push("prompt_token_estimate_over_limit");
  }

  if (input.modelResolution.disabledReason) {
    blockingReasons.push(input.modelResolution.disabledReason);
  }

  if (modelTier === "none" || !input.modelResolution.model) {
    blockingReasons.push("model_not_selected");
  }

  if (input.modelResolution.model && !input.modelResolution.model.configured) {
    blockingReasons.push("model_not_configured");
  }

  if (tierRuntime && !tierRuntime.apiKey.configured) {
    blockingReasons.push("provider_api_key_missing");
  }

  if (tierRuntime?.pricing.inputCentsPerMillion === undefined) {
    blockingReasons.push("input_pricing_missing");
  }

  if (estimatedOutputTokens > 0 && tierRuntime?.pricing.outputCentsPerMillion === undefined) {
    blockingReasons.push("output_pricing_missing");
  }

  if (withinTarget === false) {
    blockingReasons.push("estimated_llm_cost_over_target");
  }

  if (!input.allowProviderCall) {
    warnings.push("Live LLM provider call was not requested for this Admin action.");
  }

  const readinessStatus = blockingReasons.length === 0 ? "ready" : "blocked";
  const status: DeliveryAgentLlmCandidatePlanningLiveCallGateStatus = !input.allowProviderCall
    ? "not_requested"
    : readinessStatus === "ready"
      ? "allowed"
      : "blocked";

  return {
    gateVersion: DELIVERY_AGENT_LLM_PROVIDER_READINESS_VERSION,
    status,
    readinessStatus,
    liveCallRequested: input.allowProviderCall,
    liveCallAllowed: status === "allowed",
    callType,
    modelTier,
    provider: tierRuntime?.provider ?? input.modelResolution.model?.provider,
    modelId: tierRuntime?.modelId ?? input.modelResolution.model?.modelId,
    modelConfigured: Boolean(input.modelResolution.model?.configured),
    apiKeyConfigured: Boolean(tierRuntime?.apiKey.configured),
    apiKeyEnvVar: tierRuntime?.apiKey.envVar,
    pricingConfigured:
      tierRuntime?.pricing.inputCentsPerMillion !== undefined &&
      (estimatedOutputTokens === 0 ||
        tierRuntime?.pricing.outputCentsPerMillion !== undefined),
    pricingVersion: runtimeConfig.pricingVersion,
    inputCentsPerMillion: tierRuntime?.pricing.inputCentsPerMillion,
    outputCentsPerMillion: tierRuntime?.pricing.outputCentsPerMillion,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    estimatedCostCents,
    targetCents,
    withinTarget,
    blockingReasons: uniqueInOriginalOrder(blockingReasons),
    warnings: uniqueInOriginalOrder(warnings),
  };
}

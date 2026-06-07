import {
  findDeliveryAgentLlmProviderTierRuntimeConfig,
  resolveDeliveryAgentLlmProviderApiKeyValue,
  resolveDeliveryAgentLlmProviderRuntimeConfig,
  type DeliveryAgentLlmProviderEnv,
  type DeliveryAgentLlmProviderRuntimeConfig,
} from "@/lib/agents/delivery/llm-planning/provider-readiness";
import type {
  DeliveryAgentLlmCandidateProviderExecutor,
  DeliveryAgentLlmCandidateProviderRequest,
  DeliveryAgentLlmCandidateProviderResponse,
} from "@/lib/agents/delivery/llm-planning/candidate-provider-adapter";

export const DELIVERY_AGENT_OPENAI_COMPATIBLE_PROVIDER_EXECUTOR_VERSION =
  "delivery-agent-openai-compatible-provider-executor-v1" as const;

const DEFAULT_PROVIDER_TIMEOUT_MS = 45_000;

export type DeliveryAgentOpenAiCompatibleFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export type CreateDeliveryAgentOpenAiCompatibleCandidateProviderExecutorInput = {
  runtimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  env?: DeliveryAgentLlmProviderEnv;
  fetchFn?: DeliveryAgentOpenAiCompatibleFetch;
  timeoutMs?: number;
};

type OpenAiCompatibleChatCompletionResponse = {
  id?: unknown;
  choices?: Array<{
    finish_reason?: unknown;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
  error?: {
    message?: unknown;
    type?: unknown;
  };
};

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function parseJsonOrThrow(text: string, context: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `${context}: ${error instanceof Error ? error.message : "invalid JSON"}`
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function responseErrorMessage(payload: unknown): string | undefined {
  const record = asRecord(payload);
  const error = asRecord(record?.error);
  const message = error?.message;

  return typeof message === "string" ? message : undefined;
}

function parseAssistantContent(content: unknown): unknown {
  if (typeof content !== "string") {
    return content;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return content;
  }
}

function extractProviderResponse(input: {
  payload: unknown;
  request: DeliveryAgentLlmCandidateProviderRequest;
}): DeliveryAgentLlmCandidateProviderResponse {
  const response = input.payload as OpenAiCompatibleChatCompletionResponse;
  const choice = response.choices?.[0];
  const content = choice?.message?.content;
  const warnings: string[] = [];

  if (typeof choice?.finish_reason === "string" && choice.finish_reason !== "stop") {
    warnings.push(`Provider finished with reason: ${choice.finish_reason}.`);
  }

  if (content === undefined) {
    return {
      rawCandidateOutput: undefined,
      providerRequestId: typeof response.id === "string" ? response.id : undefined,
      usage: {
        inputTokens:
          asNumber(response.usage?.prompt_tokens) ?? input.request.estimatedInputTokens,
        outputTokens: asNumber(response.usage?.completion_tokens),
        totalTokens: asNumber(response.usage?.total_tokens),
      },
      warnings,
    };
  }

  return {
    rawCandidateOutput: parseAssistantContent(content),
    providerRequestId: typeof response.id === "string" ? response.id : undefined,
    usage: {
      inputTokens: asNumber(response.usage?.prompt_tokens) ?? input.request.estimatedInputTokens,
      outputTokens: asNumber(response.usage?.completion_tokens),
      totalTokens: asNumber(response.usage?.total_tokens),
    },
    warnings,
  };
}

async function fetchWithTimeout(input: {
  fetchFn: DeliveryAgentOpenAiCompatibleFetch;
  url: string;
  requestInit: RequestInit;
  timeoutMs: number;
}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    return await input.fetchFn(input.url, {
      ...input.requestInit,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildRequestBody(request: DeliveryAgentLlmCandidateProviderRequest): Record<string, unknown> {
  return {
    model: request.modelId,
    messages: request.messages,
    response_format: { type: request.responseFormat },
    max_tokens: request.maxOutputTokens,
    temperature: 0.2,
    stream: false,
  };
}

export function createDeliveryAgentOpenAiCompatibleCandidateProviderExecutor(
  input: CreateDeliveryAgentOpenAiCompatibleCandidateProviderExecutorInput = {}
): DeliveryAgentLlmCandidateProviderExecutor {
  const runtimeConfig =
    input.runtimeConfig ?? resolveDeliveryAgentLlmProviderRuntimeConfig(input.env);
  const env = input.env ?? process.env;
  const fetchFn = input.fetchFn ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;

  return async (
    request: DeliveryAgentLlmCandidateProviderRequest
  ): Promise<DeliveryAgentLlmCandidateProviderResponse> => {
    const tierRuntime = findDeliveryAgentLlmProviderTierRuntimeConfig({
      runtimeConfig,
      modelProvider: request.modelProvider,
      modelId: request.modelId,
    });

    if (!tierRuntime) {
      throw new Error("provider_runtime_config_missing_for_model");
    }

    if (tierRuntime.protocol !== "openai_chat_completions") {
      throw new Error("provider_protocol_not_supported_for_live_dry_run");
    }

    if (!tierRuntime.baseUrl) {
      throw new Error("provider_base_url_missing");
    }

    const apiKey = resolveDeliveryAgentLlmProviderApiKeyValue({
      runtimeConfig,
      modelProvider: request.modelProvider,
      modelId: request.modelId,
      env,
    });

    if (!apiKey) {
      throw new Error("provider_api_key_missing");
    }

    const response = await fetchWithTimeout({
      fetchFn,
      url: buildChatCompletionsUrl(tierRuntime.baseUrl),
      timeoutMs,
      requestInit: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildRequestBody(request)),
      },
    });
    const responseText = await response.text();
    const payload = parseJsonOrThrow(responseText, "provider_response_not_json");

    if (!response.ok) {
      throw new Error(
        `provider_http_${response.status}: ${
          responseErrorMessage(payload) ?? response.statusText
        }`
      );
    }

    return extractProviderResponse({ payload, request });
  };
}

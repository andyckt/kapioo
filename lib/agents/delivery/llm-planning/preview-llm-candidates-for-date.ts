import { randomUUID } from "crypto";

import { previewCandidatePlansPipeline } from "@/lib/agents/delivery/candidate-plans/preview-candidate-plans";
import { runDeliveryAgentLlmCandidatePlanningCore } from "@/lib/agents/delivery/llm-planning/candidate-planning-for-date";
import type { DeliveryAgentLlmCandidateProviderExecutor } from "@/lib/agents/delivery/llm-planning/candidate-provider-adapter";
import type { DeliveryAgentLlmProviderRuntimeConfig } from "@/lib/agents/delivery/llm-planning/provider-readiness";
import { DeliveryAgentPlanningBlockedError } from "@/lib/agents/delivery/errors";
import type { DeliveryAgentCostPolicy } from "@/lib/contracts/delivery-agent-cost-policy";
import type {
  DeliveryAgentLlmCandidatePreviewResponse,
  DeliveryAgentLlmCandidatePlanningResponse,
  DeliveryAgentPreviewCandidatePlansResponse,
} from "@/lib/contracts/delivery-agent";

export type PreviewDeliveryAgentLlmCandidatesForDateInput = {
  deliveryDate: string;
  profileId?: string;
  correlationId?: string;
  includeHistoricalPackage?: boolean;
  forceRefresh?: boolean;
  allowProviderCall?: boolean;
  provider?: DeliveryAgentLlmCandidateProviderExecutor;
  providerRuntimeConfig?: DeliveryAgentLlmProviderRuntimeConfig;
  policy?: DeliveryAgentCostPolicy;
  nowMs?: number;
};

export type { DeliveryAgentLlmCandidatePreviewResponse };

/**
 * Runs the LLM candidate planning pipeline (cache-first) and immediately feeds
 * the ranked finalist CandidatePlan[] into the budgeted RO preview pipeline.
 *
 * Server-side only — full CandidatePlan objects are never serialised to the client.
 * The client receives only the standard DeliveryAgentLlmCandidatePlanningResponse
 * (summaries) plus the full DeliveryAgentPreviewCandidatePlansResponse that the
 * existing DeliveryAgentReviewPanel already consumes.
 */
export async function previewDeliveryAgentLlmCandidatesForDate(
  input: PreviewDeliveryAgentLlmCandidatesForDateInput
): Promise<DeliveryAgentLlmCandidatePreviewResponse> {
  const { response: llmResult, finalistCandidates } =
    await runDeliveryAgentLlmCandidatePlanningCore({
      deliveryDate: input.deliveryDate,
      profileId: input.profileId,
      includeHistoricalPackage: input.includeHistoricalPackage,
      forceRefresh: input.forceRefresh,
      allowProviderCall: input.allowProviderCall,
      provider: input.provider,
      providerRuntimeConfig: input.providerRuntimeConfig,
      policy: input.policy,
      nowMs: input.nowMs,
    });

  if (finalistCandidates.length === 0) {
    throw new DeliveryAgentPlanningBlockedError([
      `LLM planning produced no valid finalist plans (status: ${llmResult.status}). ` +
        `Run a successful live LLM dry run first before requesting Route Optimizer preview.`,
    ]);
  }

  const previewResult: DeliveryAgentPreviewCandidatePlansResponse =
    await previewCandidatePlansPipeline({
      deliveryDate: input.deliveryDate,
      profileId: input.profileId,
      baseCandidates: finalistCandidates,
      previewBudget: {
        action: "llm_candidate_preview",
        correlationId:
          input.correlationId ??
          `delivery-agent:llm_candidate_preview:${input.deliveryDate}:${randomUUID()}`,
      },
    });

  return { llmResult, previewResult };
}

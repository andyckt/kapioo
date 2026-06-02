export type BuildFinalRouteIdentityInput = {
  deliveryDate: string;
  deliveryAgentRunId: string;
  profileId: string;
  selectedCandidateId: string;
  runSlot: string;
  finalRouteGeneration?: number;
};

export function buildFinalRouteGenerationSuffix(generation: number | undefined): string {
  const value = generation ?? 1;
  return value > 1 ? `:v${value}` : "";
}

export function buildFinalRouteExternalId(
  input: Pick<
    BuildFinalRouteIdentityInput,
    "deliveryDate" | "deliveryAgentRunId" | "selectedCandidateId" | "runSlot" | "finalRouteGeneration"
  >
): string {
  const suffix = buildFinalRouteGenerationSuffix(input.finalRouteGeneration);
  return [
    "kapioo-final-run",
    input.deliveryDate,
    input.deliveryAgentRunId,
    input.selectedCandidateId,
    input.runSlot,
  ].join(":") + suffix;
}

export function buildFinalRouteIdempotencyKey(
  input: Pick<
    BuildFinalRouteIdentityInput,
    "deliveryDate" | "profileId" | "selectedCandidateId" | "runSlot" | "finalRouteGeneration"
  >
): string {
  const suffix = buildFinalRouteGenerationSuffix(input.finalRouteGeneration);
  return [
    "daily-delivery-agent",
    input.deliveryDate,
    input.profileId,
    "final",
    input.selectedCandidateId,
    input.runSlot,
  ].join(":") + suffix;
}

export function buildFinalRouteIdentity(input: BuildFinalRouteIdentityInput): {
  externalId: string;
  idempotencyKey: string;
  generationSuffix: string;
} {
  const generationSuffix = buildFinalRouteGenerationSuffix(input.finalRouteGeneration);

  return {
    externalId: buildFinalRouteExternalId(input),
    idempotencyKey: buildFinalRouteIdempotencyKey(input),
    generationSuffix,
  };
}

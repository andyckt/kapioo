import type {
  DeliveryAgentLearningResourceProfileFeatures,
  DeliveryAgentLearningStopControlFeatures,
} from "@/lib/contracts/delivery-agent-learning";
import type { RouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

import { inferRunRoleFromStops } from "@/lib/agents/delivery/learning/shared/infer-run-role";
import { isSelfOrSupportDriverName } from "@/lib/agents/delivery/learning/shared/is-self-or-support-driver";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

export function extractDeliveryAgentLearningResourceProfileFeatures(args: {
  profileId: string;
  profileName?: string | null;
  routeOptimizerResponse: RouteOptimizerRunsByDateResponse;
  stopControlFeatures?: DeliveryAgentLearningStopControlFeatures;
  expectedHiredDriverRunCount?: number | null;
  supportAvailable?: boolean | null;
}): DeliveryAgentLearningResourceProfileFeatures {
  const warnings: string[] = [];
  const profileTransferNotes: string[] = [];
  const runs = args.routeOptimizerResponse.runs;
  const stopControlFeatures =
    args.stopControlFeatures ??
    extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: args.routeOptimizerResponse,
    });

  const driverNamesRaw = runs.map((run) => run.driver_name);
  const runRoles =
    stopControlFeatures.runs.length > 0
      ? stopControlFeatures.runs.map((run) => run.runRole)
      : runs.map((run) => inferRunRoleFromStops(run.stops));

  const selfRunUsed = runs.some((run) => isSelfOrSupportDriverName(run.driver_name));
  const supportRunUsed =
    runRoles.includes("support_rescue") ||
    runs.some((run) => isSelfOrSupportDriverName(run.driver_name));

  const runCountUsed = runs.length;
  const expectedHiredDriverRunCount = args.expectedHiredDriverRunCount ?? null;
  const supportAvailable = args.supportAvailable ?? null;

  let availableRunCount: number | null = null;
  if (expectedHiredDriverRunCount !== null) {
    availableRunCount = expectedHiredDriverRunCount + (supportAvailable ? 1 : 0);
  }

  if (expectedHiredDriverRunCount === null) {
    profileTransferNotes.push("Expected hired driver count unavailable for historical case.");
  } else if (expectedHiredDriverRunCount !== runCountUsed) {
    profileTransferNotes.push(
      `Historical run count (${runCountUsed}) differs from expected hired driver count (${expectedHiredDriverRunCount}).`
    );
  }

  profileTransferNotes.push(
    "Exact profile compatibility scoring is computed later in M21 retrieval."
  );

  if (runRoles.includes("unknown")) {
    warnings.push("unknown_run_roles_present");
  }

  return {
    profileId: args.profileId,
    profileName: args.profileName ?? null,
    hiredDriverRunCount: expectedHiredDriverRunCount,
    availableRunCount,
    supportAvailable,
    supportRunUsed,
    selfRunUsed,
    runCountUsed,
    runRoles,
    driverNamesRaw,
    profileCompatibilityForFuture: "unknown",
    profileTransferNotes,
    warnings,
  };
}

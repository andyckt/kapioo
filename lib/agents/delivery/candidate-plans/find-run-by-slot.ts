import type { DeliveryPlanningProfile, DeliveryPlanningRunSlot } from "@/lib/agents/delivery/planning-profile/types";
import type { DeliveryAgentCandidateRun } from "@/lib/contracts/delivery-agent";

export function findRunBySlot(
  runs: DeliveryAgentCandidateRun[],
  runSlot: DeliveryPlanningRunSlot
): DeliveryAgentCandidateRun | undefined {
  return runs.find((run) => run.runSlot === runSlot);
}

export function findProviderRun(
  runs: DeliveryAgentCandidateRun[],
  profile: DeliveryPlanningProfile
): DeliveryAgentCandidateRun | undefined {
  return findRunBySlot(runs, profile.handoffRules.providerRunSlot);
}

export function findPrimaryReceiverRun(
  runs: DeliveryAgentCandidateRun[],
  profile: DeliveryPlanningProfile
): DeliveryAgentCandidateRun | undefined {
  const receiverSlot = profile.handoffRules.receiverRunSlots[0];
  return receiverSlot ? findRunBySlot(runs, receiverSlot) : undefined;
}

export function findBackupRun(runs: DeliveryAgentCandidateRun[]): DeliveryAgentCandidateRun | undefined {
  const backupDriver = runs.find((run) => run.role === "self");
  return backupDriver ?? findRunBySlot(runs, "C");
}

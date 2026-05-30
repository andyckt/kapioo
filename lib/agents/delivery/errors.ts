export class DeliveryAgentPlanningBlockedError extends Error {
  blockingReasons: string[];

  constructor(blockingReasons: string[]) {
    super(blockingReasons.join(" "));
    this.name = "DeliveryAgentPlanningBlockedError";
    this.blockingReasons = blockingReasons;
  }
}

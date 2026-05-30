export class FinalRouteRunStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalRouteRunStateError";
  }
}

export class FinalRouteCreatePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalRouteCreatePayloadError";
  }
}

export class FinalRouteOptimizerCreationError extends Error {
  code: string;
  downstreamStatus?: number;
  downstreamPath?: string;
  downstreamBodyPreview?: string;
  finalRouteOptimizerMetadata?: import("@/lib/agents/delivery/run-log-types").DeliveryAgentFinalRouteOptimizerMetadata;
  routeSummaries?: import("@/lib/agents/delivery/run-log-types").DeliveryAgentFinalRouteSummary[];

  constructor(
    message: string,
    options: {
      code?: string;
      downstreamStatus?: number;
      downstreamPath?: string;
      downstreamBodyPreview?: string;
      cause?: unknown;
      finalRouteOptimizerMetadata?: import("@/lib/agents/delivery/run-log-types").DeliveryAgentFinalRouteOptimizerMetadata;
      routeSummaries?: import("@/lib/agents/delivery/run-log-types").DeliveryAgentFinalRouteSummary[];
    } = {}
  ) {
    super(message);
    this.name = "FinalRouteOptimizerCreationError";
    this.code = options.code ?? "ROUTE_OPTIMIZER_CREATE_FAILED";
    this.downstreamStatus = options.downstreamStatus;
    this.downstreamPath = options.downstreamPath;
    this.downstreamBodyPreview = options.downstreamBodyPreview;
    this.finalRouteOptimizerMetadata = options.finalRouteOptimizerMetadata;
    this.routeSummaries = options.routeSummaries;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

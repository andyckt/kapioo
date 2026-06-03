import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

import {
  buildFixedStopResponse,
  buildTwoRunHandoffResponse,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";

describe("extractDeliveryAgentLearningStopControlFeatures", () => {
  it("detects fixed, end, first, and handoff stop controls", () => {
    const features = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildFixedStopResponse(),
    });

    expect(features.fixedStopsUsed).toBe(true);
    expect(features.endStopsUsed).toBe(true);
    expect(features.firstStopsUsed).toBe(true);
  });

  it("detects handoff stops used", () => {
    const features = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });

    expect(features.handoffStopsUsed).toBe(true);
  });

  it("assigns kitchen_start_provider when customer stops precede handoff", () => {
    const features = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });

    const provider = features.runs.find((run) => run.roRunId === "run-provider");
    expect(provider?.runRole).toBe("kitchen_start_provider");
  });

  it("assigns handoff_start_receiver when first stop is handoff", () => {
    const features = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });

    const receiver = features.runs.find((run) => run.roRunId === "run-receiver");
    expect(receiver?.runRole).toBe("handoff_start_receiver");
  });

  it("preserves stop fixed/end/first/synthetic flags", () => {
    const features = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildFixedStopResponse(),
    });

    expect(features.runs[0]?.stops[0]).toMatchObject({
      fixedStopPosition: 2,
      isFirstStop: true,
      isSynthetic: false,
    });
    expect(features.runs[0]?.stops[1]).toMatchObject({
      isEndPoint: true,
    });
  });
});

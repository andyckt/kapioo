import { extractDeliveryAgentLearningRouteShapeFeatures } from "@/lib/agents/delivery/learning/route-shape/extract-route-shape-features";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

import {
  buildFixedStopResponse,
  buildSelfRunResponse,
  buildTwoRunHandoffResponse,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";

describe("extractDeliveryAgentLearningRouteShapeFeatures", () => {
  it("computes runCount and handoff sequence positions", () => {
    const response = buildTwoRunHandoffResponse();
    const stopControlFeatures = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: response,
    });
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: response,
      stopControlFeatures,
    });

    expect(features.runCount).toBe(2);
    expect(features.handoffSequencePositions).toEqual(
      expect.arrayContaining([
        { roRunId: "run-provider", sequence: 2 },
        { roRunId: "run-receiver", sequence: 0 },
      ])
    );
  });

  it("computes providerBeforeHandoffStopCount", () => {
    const response = buildTwoRunHandoffResponse();
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: response,
    });

    expect(features.providerBeforeHandoffStopCount).toBe(2);
  });

  it("sets receiverStartsAtHandoff when receiver run starts at handoff", () => {
    const response = buildTwoRunHandoffResponse();
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: response,
    });

    expect(features.receiverStartsAtHandoff).toBe(true);
  });

  it("defaults backtrackingRisk and routeDirectionSmoothness to unknown", () => {
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });

    expect(features.backtrackingRisk).toBe("unknown");
    expect(features.routeDirectionSmoothness).toBe("unknown");
  });

  it("does not hard-code Marco or DT as role names", () => {
    const response = buildTwoRunHandoffResponse();
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: response,
    });

    expect(JSON.stringify(features)).not.toContain('"Marco"');
    expect(JSON.stringify(features)).not.toContain('"DT"');
  });

  it("detects selfRunUsed from Self driver name", () => {
    const features = extractDeliveryAgentLearningRouteShapeFeatures({
      routeOptimizerResponse: buildSelfRunResponse(),
    });

    expect(features.selfRunUsed).toBe(true);
  });
});

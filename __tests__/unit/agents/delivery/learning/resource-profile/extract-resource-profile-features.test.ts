import { extractDeliveryAgentLearningResourceProfileFeatures } from "@/lib/agents/delivery/learning/resource-profile/extract-resource-profile-features";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

import {
  buildSelfRunResponse,
  buildTwoRunHandoffResponse,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";

describe("extractDeliveryAgentLearningResourceProfileFeatures", () => {
  it("stores profileId and profileName", () => {
    const features = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-v1-2-driver",
      profileName: "2 hired drivers + Donald backup",
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
      expectedHiredDriverRunCount: 2,
      supportAvailable: true,
    });

    expect(features.profileId).toBe("daily-v1-2-driver");
    expect(features.profileName).toBe("2 hired drivers + Donald backup");
  });

  it("stores expected hired driver count and runCountUsed", () => {
    const response = buildTwoRunHandoffResponse();
    const features = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-v1-2-driver",
      routeOptimizerResponse: response,
      expectedHiredDriverRunCount: 2,
    });

    expect(features.hiredDriverRunCount).toBe(2);
    expect(features.runCountUsed).toBe(2);
  });

  it("preserves driverNamesRaw and runRoles from stop controls", () => {
    const response = buildTwoRunHandoffResponse();
    const stopControlFeatures = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: response,
    });
    const features = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-v1-2-driver",
      routeOptimizerResponse: response,
      stopControlFeatures,
    });

    expect(features.driverNamesRaw).toEqual(["DT", "Marco"]);
    expect(features.runRoles).toEqual(["kitchen_start_provider", "handoff_start_receiver"]);
  });

  it("sets selfRunUsed only for clear Self/Donald driver names", () => {
    const selfFeatures = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-default",
      routeOptimizerResponse: buildSelfRunResponse(),
    });
    const hiredFeatures = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-default",
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });

    expect(selfFeatures.selfRunUsed).toBe(true);
    expect(hiredFeatures.selfRunUsed).toBe(false);
  });

  it("uses conservative unknown profile compatibility and M21 transfer notes", () => {
    const features = extractDeliveryAgentLearningResourceProfileFeatures({
      profileId: "daily-v1-2-driver",
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
      expectedHiredDriverRunCount: 3,
    });

    expect(features.profileCompatibilityForFuture).toBe("unknown");
    expect(features.profileTransferNotes.some((note) => note.includes("M21"))).toBe(true);
    expect(features.profileTransferNotes.some((note) => note.includes("differs"))).toBe(true);
  });
});

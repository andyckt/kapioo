import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { extractDeliveryAgentLearningOutcomeFeatures } from "@/lib/agents/delivery/learning/outcome/extract-outcome-features";
import { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";

import {
  buildLateDriverGoodRouteResponse,
  buildOnTimeSingleRunResponse,
  buildPlannedOnlyResponse,
  buildTwoRunHandoffResponse,
  DELIVERY_DATE,
  torontoIso,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";

describe("extractDeliveryAgentLearningOutcomeFeatures", () => {
  it("sets latestRunCompletedAt to max run_completed_at", () => {
    const response = buildTwoRunHandoffResponse();
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: response,
    });

    expect(outcome.latestRunCompletedAt).toBe(torontoIso(DELIVERY_DATE, "12:45"));
  });

  it("computes late driver good route as driver_start_delay with normalized on-time route", () => {
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildLateDriverGoodRouteResponse(),
    });

    expect(outcome.lateMinutes).toBeGreaterThan(0);
    expect(outcome.latenessAttribution).toBe("driver_start_delay");
    expect(outcome.routeWouldHaveMetDeadlineIfStartedOnTime).toBe(true);
    expect(outcome.normalizedFinishTimeIfStartedOnTime).toBe(
      torontoIso(DELIVERY_DATE, "12:45")
    );
  });

  it("marks on-time day as on_time", () => {
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildOnTimeSingleRunResponse(),
    });

    expect(outcome.latenessAttribution).toBe("on_time");
    expect(outcome.runCompletedBefore1pm).toBe(true);
  });

  it("computes etaBasisQuality post_start_majority", () => {
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildOnTimeSingleRunResponse(),
    });

    expect(outcome.etaBasisQuality).toBe("post_start_majority");
  });

  it("computes etaBasisQuality planned_only", () => {
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildPlannedOnlyResponse(),
    });

    expect(outcome.etaBasisQuality).toBe("planned_only");
  });

  it("computes perStopEtaErrorsMinutes when arrival and completed timestamps exist", () => {
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildOnTimeSingleRunResponse(),
    });

    expect(outcome.perStopEtaErrorsMinutes).toEqual([
      expect.objectContaining({
        roRunId: "run-on-time",
        sequence: 0,
        etaErrorMinutes: 5,
      }),
    ]);
  });

  it("infers handoff delay signals on handoff day with provider delay", () => {
    const stopControlFeatures = extractDeliveryAgentLearningStopControlFeatures({
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
    });
    const outcome = extractDeliveryAgentLearningOutcomeFeatures({
      deliveryDate: DELIVERY_DATE,
      routeOptimizerResponse: buildTwoRunHandoffResponse(),
      stopControlFeatures,
    });

    expect(outcome.handoffDelayLikely).toBe(true);
    expect(outcome.receiverLikelyDelayedByProvider).toBe(true);
  });

  it("does not import DB, RO client, geocode cache, or LearningCase model", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "lib/agents/delivery/learning/outcome/extract-outcome-features.ts"
      ),
      "utf8"
    );

    expect(source).not.toContain("mongoose");
    expect(source).not.toContain("fetchRouteOptimizerRunsByDate");
    expect(source).not.toContain("DeliveryAgentGeocodeCache");
    expect(source).not.toContain("DeliveryAgentLearningCase");
  });
});

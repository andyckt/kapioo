import { buildLearningCoordinateSnapshots } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-snapshots";

import {
  buildOneOrderOneHandoffMatchingResult,
  makeLearningOrder,
  makeMatchedStop,
  parsedOneRunOneStopResponse,
} from "@/__tests__/unit/agents/delivery/learning/coordinates/coordinate-fixtures";
import {
  makeCustomerStop,
  makeRoResponse,
  makeRunWithStops,
  makeSyntheticHandoffStop,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

describe("buildLearningCoordinateSnapshots", () => {
  it("creates snapshots for matched stops", () => {
    const { orders, routeOptimizerResponse, matchingResult } =
      buildOneOrderOneHandoffMatchingResult();

    const snapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    expect(snapshots[0]).toMatchObject({
      ref: "ro-stop:run-abc123:0",
      refType: "order",
      orderId: "DD-90000001",
      coordinateSource: "route_optimizer_historical",
      coordinateConfidence: "high",
    });
  });

  it("includes synthetic handoff stop snapshot after matched stops", () => {
    const { orders, routeOptimizerResponse, matchingResult } =
      buildOneOrderOneHandoffMatchingResult();

    const snapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toMatchObject({
      ref: "handoff:run-abc123:1",
      refType: "handoff",
      coordinateSource: "route_optimizer_historical",
      coordinateConfidence: "high",
      lat: 43.7,
      lng: -79.4,
    });
  });

  it("marks synthetic handoff without coords as address_only with warning", () => {
    const orders = [makeLearningOrder()];
    const routeOptimizerResponse = makeRoResponse({
      runs: [
        makeRunWithStops("run-abc123", [
          makeCustomerStop(0),
          makeSyntheticHandoffStop(1, {
            lat: null,
            lng: null,
            customer_address: "Meetup Location Only",
          }),
        ]),
      ],
    });
    const matchingResult = {
      matchedStops: [makeMatchedStop()],
      unmatchedOrders: [],
      unmatchedRoStops: [
        {
          roRunId: "run-abc123",
          roStopSequence: 1,
          isSynthetic: true,
          stopType: "handoff",
          reason: "synthetic_operational_stop",
        },
      ],
      matchCoverage: {
        totalOrders: 1,
        matchedOrders: 1,
        unmatchedOrders: 0,
        totalRoCustomerStops: 1,
        matchedRoCustomerStops: 1,
        unmatchedRoCustomerStops: 0,
        matchCoveragePercent: 100,
        exactMatches: 1,
        highConfidenceMatches: 0,
        uncertainMatches: 0,
        syntheticUnmatchedStops: 1,
      },
      warnings: [],
    };

    const snapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    const handoff = snapshots.find((snapshot) => snapshot.refType === "handoff");
    expect(handoff).toMatchObject({
      coordinateSource: "address_only",
      coordinateConfidence: "none",
      address: "Meetup Location Only",
    });
    expect(handoff?.warnings).toContain("coordinate_missing_address_only");
  });

  it("preserves stable ordering and does not mutate inputs", () => {
    const { orders, routeOptimizerResponse, matchingResult } =
      buildOneOrderOneHandoffMatchingResult();
    const ordersCopy = structuredClone(orders);
    const responseCopy = structuredClone(routeOptimizerResponse);
    const matchingCopy = structuredClone(matchingResult);

    const snapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    expect(snapshots[0]?.refType).toBe("order");
    expect(snapshots[1]?.refType).toBe("handoff");
    expect(orders).toEqual(ordersCopy);
    expect(routeOptimizerResponse).toEqual(responseCopy);
    expect(matchingResult).toEqual(matchingCopy);
  });

  it("works with parsed one-run fixture end to end", () => {
    const orders = [makeLearningOrder()];
    const matchingResult = {
      matchedStops: [
        makeMatchedStop({
          roRunId: parsedOneRunOneStopResponse.runs[0]!.run_id,
        }),
      ],
      unmatchedOrders: [],
      unmatchedRoStops: [],
      matchCoverage: {
        totalOrders: 1,
        matchedOrders: 1,
        unmatchedOrders: 0,
        totalRoCustomerStops: 1,
        matchedRoCustomerStops: 1,
        unmatchedRoCustomerStops: 0,
        matchCoveragePercent: 100,
        exactMatches: 1,
        highConfidenceMatches: 0,
        uncertainMatches: 0,
        syntheticUnmatchedStops: 0,
      },
      warnings: [],
    };

    const snapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse: parsedOneRunOneStopResponse,
      matchingResult,
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.lat).toBe(43.65);
  });
});

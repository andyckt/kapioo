import { buildLearningCoordinateCoverage } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-coverage";
import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

function makeSnapshot(
  overrides: Partial<DeliveryAgentLearningCoordinateSnapshot>
): DeliveryAgentLearningCoordinateSnapshot {
  return {
    ref: "order:DD-1",
    refType: "order",
    orderId: "DD-1",
    coordinateSource: "route_optimizer_historical",
    coordinateConfidence: "high",
    lat: 43.65,
    lng: -79.38,
    ...overrides,
  };
}

describe("buildLearningCoordinateCoverage", () => {
  it("computes coverage percent and source breakdown", () => {
    const coverage = buildLearningCoordinateCoverage([
      makeSnapshot({ ref: "order:DD-1", coordinateSource: "route_optimizer_historical" }),
      makeSnapshot({
        ref: "order:DD-2",
        orderId: "DD-2",
        coordinateSource: "order_data",
        lat: 43.66,
      }),
      makeSnapshot({
        ref: "order:DD-3",
        orderId: "DD-3",
        coordinateSource: "address_only",
        lat: null,
        lng: null,
      }),
    ]);

    expect(coverage.totalStops).toBe(3);
    expect(coverage.stopsWithCoordinates).toBe(2);
    expect(coverage.stopsAddressOnly).toBe(1);
    expect(coverage.coveragePercent).toBe(67);
    expect(coverage.sourceBreakdown).toMatchObject({
      route_optimizer_historical: 1,
      order_data: 1,
      address_only: 1,
    });
  });

  it("sets recommendation confidence thresholds", () => {
    const high = buildLearningCoordinateCoverage(
      Array.from({ length: 10 }, (_, index) =>
        makeSnapshot({ ref: `order:DD-${index}`, orderId: `DD-${index}` })
      )
    );
    expect(high.recommendationConfidence).toBe("high");

    const medium = buildLearningCoordinateCoverage([
      makeSnapshot({ ref: "order:DD-1", lat: 43.65, lng: -79.38 }),
      makeSnapshot({
        ref: "order:DD-2",
        orderId: "DD-2",
        coordinateSource: "address_only",
        lat: null,
        lng: null,
      }),
    ]);
    expect(medium.recommendationConfidence).toBe("medium");

    const low = buildLearningCoordinateCoverage([
      makeSnapshot({
        ref: "order:DD-1",
        coordinateSource: "address_only",
        lat: null,
        lng: null,
      }),
    ]);
    expect(low.recommendationConfidence).toBe("low");
  });

  it("detects handoffCoordinatesPresent", () => {
    const coverage = buildLearningCoordinateCoverage([
      makeSnapshot({
        ref: "handoff:run-1:1",
        refType: "handoff",
        orderId: null,
        lat: 43.7,
        lng: -79.4,
      }),
    ]);

    expect(coverage.handoffCoordinatesPresent).toBe(true);
  });

  it("handles zero snapshots", () => {
    const coverage = buildLearningCoordinateCoverage([]);

    expect(coverage.totalStops).toBe(0);
    expect(coverage.coveragePercent).toBe(0);
    expect(coverage.warnings).toContain("no_coordinate_snapshots");
  });

  it("warns on low coverage and missing handoff coordinates", () => {
    const lowCoverage = buildLearningCoordinateCoverage([
      makeSnapshot({ ref: "order:DD-1", lat: 43.65, lng: -79.38 }),
      makeSnapshot({
        ref: "order:DD-2",
        orderId: "DD-2",
        coordinateSource: "address_only",
        lat: null,
        lng: null,
      }),
      makeSnapshot({
        ref: "order:DD-3",
        orderId: "DD-3",
        coordinateSource: "address_only",
        lat: null,
        lng: null,
      }),
    ]);
    expect(lowCoverage.warnings).toContain("low_coordinate_coverage");

    const missingHandoff = buildLearningCoordinateCoverage([
      makeSnapshot({
        ref: "handoff:run-1:1",
        refType: "handoff",
        orderId: null,
        coordinateSource: "address_only",
        lat: null,
        lng: null,
        address: "Meetup only",
      }),
    ]);
    expect(missingHandoff.warnings).toContain("handoff_coordinates_missing");
  });
});

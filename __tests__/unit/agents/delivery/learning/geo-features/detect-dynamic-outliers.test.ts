import { detectDynamicOutliers } from "@/lib/agents/delivery/learning/geo-features/detect-dynamic-outliers";
import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

function makeOrderSnapshot(
  ref: string,
  orderId: string,
  lat: number,
  lng: number
): DeliveryAgentLearningCoordinateSnapshot {
  return {
    ref,
    refType: "order",
    orderId,
    coordinateSource: "route_optimizer_historical",
    coordinateConfidence: "high",
    lat,
    lng,
  };
}

describe("detectDynamicOutliers", () => {
  const centerPoint = { lat: 43.65, lng: -79.38 };

  it("detects far-west and far-north outliers sorted by distance desc", () => {
    const outliers = detectDynamicOutliers({
      centerPoint,
      snapshots: [
        makeOrderSnapshot("order:DD-1", "DD-1", 43.651, -79.381),
        makeOrderSnapshot("order:DD-2", "DD-2", 43.78, -79.37),
        makeOrderSnapshot("order:DD-3", "DD-3", 43.66, -79.55),
      ],
      minDistanceFromCenterKm: 8,
      topN: 5,
    });

    expect(outliers.length).toBeGreaterThanOrEqual(2);
    expect(outliers[0]!.distanceFromCenterKm).toBeGreaterThanOrEqual(
      outliers[outliers.length - 1]!.distanceFromCenterKm
    );
    expect(outliers.some((outlier) => outlier.direction?.includes("west"))).toBe(true);
    expect(outliers.some((outlier) => outlier.direction?.includes("north"))).toBe(true);
  });

  it("honors topN", () => {
    const outliers = detectDynamicOutliers({
      centerPoint,
      snapshots: [
        makeOrderSnapshot("order:DD-1", "DD-1", 43.8, -79.38),
        makeOrderSnapshot("order:DD-2", "DD-2", 43.5, -79.38),
        makeOrderSnapshot("order:DD-3", "DD-3", 43.65, -79.55),
      ],
      minDistanceFromCenterKm: 8,
      topN: 1,
    });

    expect(outliers).toHaveLength(1);
  });

  it("returns empty with no center or no qualifying points", () => {
    expect(
      detectDynamicOutliers({
        centerPoint: null,
        snapshots: [makeOrderSnapshot("order:DD-1", "DD-1", 43.65, -79.38)],
      })
    ).toEqual([]);

    expect(
      detectDynamicOutliers({
        centerPoint,
        snapshots: [makeOrderSnapshot("order:DD-1", "DD-1", 43.651, -79.381)],
        minDistanceFromCenterKm: 100,
      })
    ).toEqual([]);
  });
});

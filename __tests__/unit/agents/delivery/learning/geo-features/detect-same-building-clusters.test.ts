import { detectSameBuildingClusters } from "@/lib/agents/delivery/learning/geo-features/detect-same-building-clusters";
import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

function makeOrderSnapshot(
  orderId: string,
  lat: number,
  lng: number
): DeliveryAgentLearningCoordinateSnapshot {
  return {
    ref: `order:${orderId}`,
    refType: "order",
    orderId,
    coordinateSource: "route_optimizer_historical",
    coordinateConfidence: "high",
    lat,
    lng,
  };
}

describe("detectSameBuildingClusters", () => {
  it("groups nearby orders within threshold", () => {
    const clusters = detectSameBuildingClusters({
      snapshots: [
        makeOrderSnapshot("DD-1", 43.6532, -79.3832),
        makeOrderSnapshot("DD-2", 43.65325, -79.38325),
        makeOrderSnapshot("DD-3", 43.7, -79.4),
      ],
      maxDistanceMeters: 50,
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.orderIds).toEqual(["DD-1", "DD-2"]);
    expect(clusters[0]?.clusterId).toBe("same-building-1");
    expect(clusters[0]?.center).toBeDefined();
  });

  it("does not group far apart orders", () => {
    const clusters = detectSameBuildingClusters({
      snapshots: [
        makeOrderSnapshot("DD-1", 43.65, -79.38),
        makeOrderSnapshot("DD-2", 43.75, -79.2),
      ],
      maxDistanceMeters: 50,
    });

    expect(clusters).toEqual([]);
  });

  it("only returns clusters with 2+ orders", () => {
    const clusters = detectSameBuildingClusters({
      snapshots: [makeOrderSnapshot("DD-1", 43.65, -79.38)],
    });

    expect(clusters).toEqual([]);
  });
});

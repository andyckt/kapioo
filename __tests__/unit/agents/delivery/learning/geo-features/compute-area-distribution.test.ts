import { computeAreaDistribution } from "@/lib/agents/delivery/learning/geo-features/compute-area-distribution";
import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

import { makeLearningOrder } from "@/__tests__/unit/agents/delivery/learning/coordinates/coordinate-fixtures";

describe("computeAreaDistribution", () => {
  it("counts order area values and unknown for missing area", () => {
    const distribution = computeAreaDistribution({
      orders: [
        makeLearningOrder({ orderId: "DD-1", area: "Downtown Toronto" }),
        makeLearningOrder({ orderId: "DD-2", area: "North York" }),
        makeLearningOrder({ orderId: "DD-3", area: null }),
      ],
      snapshots: [
        {
          ref: "order:DD-1",
          refType: "order",
          orderId: "DD-1",
          coordinateSource: "route_optimizer_historical",
          coordinateConfidence: "high",
        },
        {
          ref: "order:DD-2",
          refType: "order",
          orderId: "DD-2",
          coordinateSource: "route_optimizer_historical",
          coordinateConfidence: "high",
        },
        {
          ref: "order:DD-3",
          refType: "order",
          orderId: "DD-3",
          coordinateSource: "route_optimizer_historical",
          coordinateConfidence: "high",
        },
      ] satisfies DeliveryAgentLearningCoordinateSnapshot[],
    });

    expect(distribution).toEqual({
      "Downtown Toronto": 1,
      "North York": 1,
      unknown: 1,
    });
  });

  it("does not require coordinates", () => {
    const distribution = computeAreaDistribution({
      orders: [makeLearningOrder({ orderId: "DD-1", area: "Downtown Toronto" })],
      snapshots: [
        {
          ref: "order:DD-1",
          refType: "order",
          orderId: "DD-1",
          coordinateSource: "address_only",
          coordinateConfidence: "none",
          lat: null,
          lng: null,
        },
      ],
    });

    expect(distribution).toEqual({ "Downtown Toronto": 1 });
  });
});

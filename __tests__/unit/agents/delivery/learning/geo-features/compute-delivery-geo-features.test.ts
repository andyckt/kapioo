import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildLearningCoordinateSnapshots } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-snapshots";
import { computeDeliveryGeoFeatures } from "@/lib/agents/delivery/learning/geo-features/compute-delivery-geo-features";

import {
  buildOneOrderOneHandoffMatchingResult,
  makeLearningOrder,
} from "@/__tests__/unit/agents/delivery/learning/coordinates/coordinate-fixtures";

describe("computeDeliveryGeoFeatures", () => {
  it("produces coordinateCoverage, boundingBox, center, spread, and distances", () => {
    const { orders, routeOptimizerResponse, matchingResult } =
      buildOneOrderOneHandoffMatchingResult();
    const coordinateSnapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    const geoFeatures = computeDeliveryGeoFeatures({
      orders,
      coordinateSnapshots,
    });

    expect(geoFeatures.coordinateCoverage.totalStops).toBe(2);
    expect(geoFeatures.boundingBox).not.toBeNull();
    expect(geoFeatures.centerPoint).not.toBeNull();
    expect(geoFeatures.spreadKm).not.toBeNull();
    expect(geoFeatures.maxDistanceFromCenterKm).toBeGreaterThan(0);
    expect(geoFeatures.maxDistanceFromHandoffKm).toBeGreaterThan(0);
    expect(geoFeatures.maxDistanceFromKitchenKm).toBeNull();
    expect(geoFeatures.warnings).toContain("kitchen_coordinates_unconfigured");
    expect(geoFeatures.sameBuildingClusterCount).toBe(0);
  });

  it("computes maxDistanceFromKitchenKm when kitchenPoint is provided", () => {
    const { orders, routeOptimizerResponse, matchingResult } =
      buildOneOrderOneHandoffMatchingResult();
    const coordinateSnapshots = buildLearningCoordinateSnapshots({
      orders,
      routeOptimizerResponse,
      matchingResult,
    });

    const geoFeatures = computeDeliveryGeoFeatures({
      orders,
      coordinateSnapshots,
      kitchenPoint: { lat: 43.64, lng: -79.39 },
    });

    expect(geoFeatures.maxDistanceFromKitchenKm).toBeGreaterThan(0);
    expect(geoFeatures.warnings).not.toContain("kitchen_coordinates_unconfigured");
  });

  it("produces sameBuildingClusterCount when nearby orders exist", () => {
    const orders = [
      makeLearningOrder({ orderId: "DD-1", area: "Downtown Toronto" }),
      makeLearningOrder({ orderId: "DD-2", area: "Downtown Toronto", lat: 43.65325, lng: -79.38325 }),
    ];
    const coordinateSnapshots = [
      {
        ref: "order:DD-1",
        refType: "order" as const,
        orderId: "DD-1",
        coordinateSource: "route_optimizer_historical" as const,
        coordinateConfidence: "high" as const,
        lat: 43.6532,
        lng: -79.3832,
      },
      {
        ref: "order:DD-2",
        refType: "order" as const,
        orderId: "DD-2",
        coordinateSource: "route_optimizer_historical" as const,
        coordinateConfidence: "high" as const,
        lat: 43.65325,
        lng: -79.38325,
      },
    ];

    const geoFeatures = computeDeliveryGeoFeatures({
      orders,
      coordinateSnapshots,
    });

    expect(geoFeatures.sameBuildingClusterCount).toBe(1);
    expect(geoFeatures.sameBuildingClusters[0]?.orderIds).toEqual(["DD-1", "DD-2"]);
    expect(geoFeatures.areaDistribution).toEqual({ "Downtown Toronto": 2 });
  });

  it("does not import DB, RO client, geocode cache, or LearningCase model", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "lib/agents/delivery/learning/geo-features/compute-delivery-geo-features.ts"
      ),
      "utf8"
    );

    expect(source).not.toContain("mongoose");
    expect(source).not.toContain("fetchRouteOptimizerRunsByDate");
    expect(source).not.toContain("DeliveryAgentGeocodeCache");
    expect(source).not.toContain("DeliveryAgentLearningCase");
    expect(source).not.toContain("enrichRoutingStops");
  });
});

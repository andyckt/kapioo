import { describe, expect, it } from "vitest";

import { buildCoordinateCoverageSummary } from "@/lib/agents/delivery/geocode/build-coordinate-coverage-summary";
import type { DeliveryAgentStopCoordinateRecord } from "@/lib/agents/delivery/geocode/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

function buildStop(orderId: string, area = "North York"): RoutingStop {
  return {
    orderId,
    mongoId: orderId,
    customerName: "Customer",
    customerPhone: "4165550100",
    customerEmail: "test@example.com",
    area,
    formattedAddress: "123 Main St",
    deliveryAddress: {
      unitNumber: "",
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M2N 1A1",
      country: "Canada",
      buzzCode: "",
    },
    notes: "",
    specialInstructions: "",
    deliveryDate: "2026-06-09",
    deliveryWindow: "11:00-13:00",
    mealSummary: "2 meals",
    totalMealQuantity: 2,
    items: [],
    status: "confirmed",
    hasAdminOverride: false,
    routeOptimizer: {
      name: "Customer",
      phone: "4165550100",
      address: "123 Main St",
      notes: "",
      order_ids: [orderId],
    },
  };
}

function buildRecord(
  orderId: string,
  overrides: Partial<DeliveryAgentStopCoordinateRecord> = {}
): DeliveryAgentStopCoordinateRecord {
  return {
    orderId,
    normalizedAddressKey: orderId,
    formattedAddress: "123 Main St",
    lat: 43.76,
    lng: -79.41,
    source: "route_optimizer_geocode",
    status: "ok",
    confidence: "high",
    geocodedAt: "2026-06-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildCoordinateCoverageSummary", () => {
  it("returns high confidence when all stops have coordinates", () => {
    const stops = [buildStop("a"), buildStop("b", "Downtown Toronto")];
    const summary = buildCoordinateCoverageSummary({
      stops,
      stopCoordinates: [buildRecord("a"), buildRecord("b")],
    });

    expect(summary.totalValidStops).toBe(2);
    expect(summary.stopsWithCoordinates).toBe(2);
    expect(summary.stopsFallback).toBe(0);
    expect(summary.coveragePercent).toBe(100);
    expect(summary.recommendationConfidence).toBe("high");
  });

  it("returns low confidence when flexible stop is missing coordinates", () => {
    const stops = [buildStop("a"), buildStop("b", "North York")];
    const summary = buildCoordinateCoverageSummary({
      stops,
      stopCoordinates: [buildRecord("a")],
    });

    expect(summary.stopsFallback).toBe(1);
    expect(summary.recommendationConfidence).toBe("low");
  });

  it("returns medium confidence for partial coverage without flexible gaps", () => {
    const stops = [
      buildStop("a", "Downtown Toronto"),
      buildStop("b", "Markham"),
      buildStop("c", "Richmond Hill"),
      buildStop("d", "Midtown"),
    ];
    const summary = buildCoordinateCoverageSummary({
      stops,
      stopCoordinates: [buildRecord("a"), buildRecord("b"), buildRecord("c")],
    });

    expect(summary.coveragePercent).toBe(75);
    expect(summary.recommendationConfidence).toBe("medium");
  });
});

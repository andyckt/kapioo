const readGeocodeCacheBatchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/agents/delivery/geocode/geocode-cache", () => ({
  readGeocodeCacheBatch: readGeocodeCacheBatchMock,
}));

import { buildEnrichedRoutingStopLookup } from "@/lib/agents/delivery/final-route-run/build-enriched-routing-stop-lookup";
import { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";
import { buildNormalizedAddressKey } from "@/lib/agents/delivery/geocode/normalize-address-key";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { DeliveryAgentCandidatePlanPreview } from "@/lib/contracts/delivery-agent";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

function routingStop(orderId: string, address: string): RoutingStop {
  return {
    orderId,
    mongoId: orderId,
    customerName: orderId,
    customerPhone: "416-555-0100",
    area: "North York",
    formattedAddress: address,
    deliveryAddress: {
      unitNumber: "",
      streetAddress: address,
      city: "Toronto",
      province: "ON",
      postalCode: "",
      country: "Canada",
      buzzCode: "",
    },
    totalMealQuantity: 1,
    warnings: [],
    routeOptimizer: {
      name: orderId,
      phone: "416-555-0100",
      address,
      notes: "",
      order_ids: [orderId],
    },
  } as unknown as RoutingStop;
}

const finalAcceptedPlan = {
  candidateId: "candidate:selected",
  runs: [
    {
      runSlot: "A",
      driverName: "Provider",
      stopCount: 2,
      optimizedStopCount: 2,
      optimizedStops: [
        { sequence: 1, orderIds: ["DD-1"], address: "1 Provider St" },
        { sequence: 2, orderIds: ["kapioo-handoff-meetup:2026-06-09:A"], address: "4000 Yonge St" },
      ],
      previewStatus: "previewed",
    },
    {
      runSlot: "B",
      driverName: "Receiver",
      stopCount: 1,
      optimizedStopCount: 1,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-2"], address: "2 Receiver St" }],
      previewStatus: "previewed",
    },
  ],
  handoffPlan: {
    providerRunSlot: "A",
    receiverRunSlot: "B",
    selectedMeetup: {
      meetupAddress: "4000 Yonge St",
      meetupFixedStopPosition: 2,
      variant: "meetup_stop_1",
      syntheticHandoffStopUsed: true,
      stopBeforeMeetupOrderId: "DD-1",
      sourceOrderId: "DD-1",
      sourceArea: "North York",
    },
  },
} as unknown as DeliveryAgentCandidatePlanPreview;

function buildRun(overrides: Partial<IDeliveryAgentRun> = {}): IDeliveryAgentRun {
  return {
    id: "run-123",
    deliveryDate: "2026-06-09",
    profileId: "daily-profile",
    ...overrides,
  } as unknown as IDeliveryAgentRun;
}

describe("buildEnrichedRoutingStopLookup", () => {
  beforeEach(() => {
    readGeocodeCacheBatchMock.mockReset();
    readGeocodeCacheBatchMock.mockResolvedValue(new Map());
  });

  it("overlays lat/lng from run.geocodeEnrichment by orderId", async () => {
    const baseStops = [
      routingStop("DD-1", "1 Provider St"),
      routingStop("DD-2", "2 Receiver St"),
    ];
    const run = buildRun({
      geocodeEnrichment: {
        artifactVersion: "1",
        enrichedAt: "2026-06-09T10:00:00.000Z",
        provider: "route_optimizer",
        stopCoordinates: [
          {
            orderId: "DD-1",
            normalizedAddressKey: "key-1",
            formattedAddress: "1 Provider St",
            lat: 43.7615,
            lng: -79.4111,
            source: "route_optimizer_geocode",
            status: "ok",
          },
          {
            orderId: "DD-2",
            normalizedAddressKey: "key-2",
            formattedAddress: "2 Receiver St",
            lat: 43.77,
            lng: -79.42,
            source: "route_optimizer_geocode",
            status: "ok",
          },
        ],
        coordinateCoverage: {
          totalValidStops: 2,
          stopsWithCoordinates: 2,
          stopsFallback: 0,
          stopsGeocodeFailed: 0,
          coveragePercent: 100,
          recommendationConfidence: "high",
        },
      },
    });

    const result = await buildEnrichedRoutingStopLookup({
      run,
      finalAcceptedPlan,
      baseStops,
    });

    expect(result.routingStopByOrderId.get("DD-1")?.lat).toBe(43.7615);
    expect(result.routingStopByOrderId.get("DD-2")?.lng).toBe(-79.42);
    expect(result.coordinateAudit.fromGeocodeEnrichment).toBe(2);
    expect(result.coordinateAudit.coordinateParity).toBe("full");
    expect(readGeocodeCacheBatchMock).not.toHaveBeenCalled();
  });

  it("falls back to candidatePreviewSnapshot.geocodeEnrichment when run record is missing per order", async () => {
    const baseStops = [
      routingStop("DD-1", "1 Provider St"),
      routingStop("DD-2", "2 Receiver St"),
    ];
    const run = buildRun({
      geocodeEnrichment: {
        artifactVersion: "1",
        enrichedAt: "2026-06-09T10:00:00.000Z",
        provider: "route_optimizer",
        stopCoordinates: [
          {
            orderId: "DD-1",
            normalizedAddressKey: "key-1",
            formattedAddress: "1 Provider St",
            lat: 43.7615,
            lng: -79.4111,
            source: "route_optimizer_geocode",
            status: "ok",
          },
        ],
        coordinateCoverage: {
          totalValidStops: 1,
          stopsWithCoordinates: 1,
          stopsFallback: 0,
          stopsGeocodeFailed: 0,
          coveragePercent: 50,
          recommendationConfidence: "medium",
        },
      },
      planningArtifacts: {
        artifactVersion: "planning-artifacts-v1",
        candidatePreviewSnapshot: {
          geocodeEnrichment: {
            artifactVersion: "1",
            enrichedAt: "2026-06-09T09:00:00.000Z",
            provider: "route_optimizer",
            stopCoordinates: [
              {
                orderId: "DD-2",
                normalizedAddressKey: "key-2",
                formattedAddress: "2 Receiver St",
                lat: 43.78,
                lng: -79.43,
                source: "route_optimizer_geocode",
                status: "ok",
              },
            ],
            coordinateCoverage: {
              totalValidStops: 1,
              stopsWithCoordinates: 1,
              stopsFallback: 0,
              stopsGeocodeFailed: 0,
              coveragePercent: 100,
              recommendationConfidence: "high",
            },
          },
        },
      },
    });

    const result = await buildEnrichedRoutingStopLookup({
      run,
      finalAcceptedPlan,
      baseStops,
    });

    expect(result.routingStopByOrderId.get("DD-1")?.lat).toBe(43.7615);
    expect(result.routingStopByOrderId.get("DD-2")?.lat).toBe(43.78);
    expect(result.coordinateAudit.fromGeocodeEnrichment).toBe(1);
    expect(result.coordinateAudit.fromPreviewSnapshotEnrichment).toBe(1);
    expect(result.coordinateAudit.coordinateParity).toBe("full");
  });

  it("uses cache-only fallback when enrichment is missing", async () => {
    const stop = routingStop("DD-1", "1 Provider St");
    const baseStops = [stop, routingStop("DD-2", "2 Receiver St")];
    const cacheKey = buildNormalizedAddressKey(stop);

    readGeocodeCacheBatchMock.mockImplementation(async (keys: string[]) => {
      const map = new Map<string, unknown>();
      for (const key of keys) {
        if (key === cacheKey) {
          map.set(key, {
            normalizedAddressKey: key,
            formattedAddress: stop.formattedAddress,
            lat: 43.75,
            lng: -79.4,
            status: "ok",
            confidence: "high",
          });
        }
      }
      return map;
    });

    const result = await buildEnrichedRoutingStopLookup({
      run: buildRun(),
      finalAcceptedPlan,
      baseStops,
    });

    expect(result.routingStopByOrderId.get("DD-1")?.lat).toBe(43.75);
    expect(result.coordinateAudit.fromCacheFallback).toBe(1);
    expect(result.coordinateAudit.addressOnlyFallback).toBe(1);
    expect(result.coordinateAudit.coordinateParity).toBe("partial");
  });

  it("records address-only stops in audit when no coordinates are available", async () => {
    const result = await buildEnrichedRoutingStopLookup({
      run: buildRun(),
      finalAcceptedPlan,
      baseStops: [
        routingStop("DD-1", "1 Provider St"),
        routingStop("DD-2", "2 Receiver St"),
      ],
    });

    expect(result.coordinateAudit.addressOnlyFallback).toBe(2);
    expect(result.coordinateAudit.missingCoordinateOrderIds).toEqual(["DD-1", "DD-2"]);
    expect(result.coordinateAudit.coordinateParity).toBe("low");
  });

  it("throws FinalRouteCreatePayloadError when an approved order is missing from live confirmed orders", async () => {
    await expect(
      buildEnrichedRoutingStopLookup({
        run: buildRun(),
        finalAcceptedPlan,
        baseStops: [routingStop("DD-1", "1 Provider St")],
      })
    ).rejects.toBeInstanceOf(FinalRouteCreatePayloadError);
  });

  it("excludes synthetic order IDs from required-order validation", async () => {
    const result = await buildEnrichedRoutingStopLookup({
      run: buildRun({
        geocodeEnrichment: {
          artifactVersion: "1",
          enrichedAt: "2026-06-09T10:00:00.000Z",
          provider: "route_optimizer",
          stopCoordinates: [
            {
              orderId: "DD-1",
              normalizedAddressKey: "key-1",
              formattedAddress: "1 Provider St",
              lat: 43.7615,
              lng: -79.4111,
              source: "route_optimizer_geocode",
              status: "ok",
            },
          ],
          coordinateCoverage: {
            totalValidStops: 1,
            stopsWithCoordinates: 1,
            stopsFallback: 0,
            stopsGeocodeFailed: 0,
            coveragePercent: 100,
            recommendationConfidence: "high",
          },
        },
      }),
      finalAcceptedPlan,
      baseStops: [
        routingStop("DD-1", "1 Provider St"),
        routingStop("DD-2", "2 Receiver St"),
      ],
    });

    expect(result.coordinateAudit.syntheticStopCount).toBe(1);
    expect(result.coordinateAudit.totalRealCustomerStops).toBe(2);
    expect(result.meetupCoordinates).toEqual({
      lat: 43.7615,
      lng: -79.4111,
      source: "route_optimizer_geocode",
    });
  });
});

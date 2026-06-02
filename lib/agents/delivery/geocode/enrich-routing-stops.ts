import { geocodeAddressesBatch } from "@/lib/integrations/route-optimizer/client";
import { buildRouteOptimizerUrl, getRouteOptimizerConfig } from "@/lib/integrations/route-optimizer/config";
import {
  RouteOptimizerRateLimitError,
  RouteOptimizerResponseError,
} from "@/lib/integrations/route-optimizer/errors";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";
import type { RouteOptimizerGeocodeResultItem } from "@/lib/integrations/route-optimizer/types";
import type { RoutingStop } from "@/lib/agents/delivery/types";

import { buildCoordinateCoverageSummary } from "@/lib/agents/delivery/geocode/build-coordinate-coverage-summary";
import {
  buildGeocodeBatchFailureAlert,
  buildPartialGeocodeFailureAlert,
} from "@/lib/agents/delivery/geocode/geocode-enrichment-alerts";
import { readGeocodeCacheBatch, writeGeocodeCacheEntry } from "@/lib/agents/delivery/geocode/geocode-cache";
import {
  buildGeocodeIdempotencyKey,
  buildNormalizedAddressKey,
} from "@/lib/agents/delivery/geocode/normalize-address-key";
import type {
  CoordinateConfidence,
  CoordinateSource,
  CoordinateStatus,
  DeliveryAgentGeocodeEnrichment,
  DeliveryAgentStopCoordinateRecord,
  GeocodeEnrichmentAlert,
  GeocodeEnrichmentRunStats,
} from "@/lib/agents/delivery/geocode/types";

import {
  overlayCoordinatesOnRoutingStop,
  readFiniteCoordinate,
  routingStopHasCoordinates,
} from "@/lib/agents/delivery/geocode/overlay-coordinates-on-routing-stop";

function mapGeocodeStatusToCoordinateStatus(geocodeStatus?: string): CoordinateStatus {
  const normalized = geocodeStatus?.trim().toUpperCase();
  if (!normalized || normalized === "ZERO_RESULTS" || normalized === "FAILED") {
    return "failed";
  }

  if (normalized === "APPROXIMATE") {
    return "approximate";
  }

  return "ok";
}

function mapGeocodeConfidence(result: RouteOptimizerGeocodeResultItem): CoordinateConfidence {
  const raw = result.confidence?.trim().toLowerCase();
  if (raw === "high" || raw === "medium" || raw === "low") {
    return raw;
  }

  const locationType = result.location_type?.trim().toUpperCase();
  if (locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED") {
    return "high";
  }

  if (locationType === "GEOMETRIC_CENTER" || locationType === "APPROXIMATE") {
    return "medium";
  }

  return "medium";
}

function buildStopCoordinateRecord(
  stop: RoutingStop,
  normalizedAddressKey: string,
  input: {
    lat?: number;
    lng?: number;
    source: CoordinateSource;
    status: CoordinateStatus;
    confidence?: CoordinateConfidence;
    geocodeStatus?: string;
  }
): DeliveryAgentStopCoordinateRecord {
  return {
    orderId: stop.orderId,
    normalizedAddressKey,
    formattedAddress: stop.formattedAddress,
    lat: readFiniteCoordinate(input.lat),
    lng: readFiniteCoordinate(input.lng),
    source: input.source,
    status: input.status,
    confidence: input.confidence,
    geocodeStatus: input.geocodeStatus,
    geocodedAt: new Date().toISOString(),
  };
}

async function applyGeocodeFallbackForPendingStop(
  enrichedStops: RoutingStop[],
  stopCoordinates: DeliveryAgentStopCoordinateRecord[],
  entry: { stop: RoutingStop; normalizedAddressKey: string },
  geocodeStatus: string,
  options?: { writeCache: boolean }
): Promise<void> {
  const { stop, normalizedAddressKey } = entry;

  if (options?.writeCache !== false) {
    await writeGeocodeCacheEntry({
      normalizedAddressKey,
      formattedAddress: stop.formattedAddress,
      status: "failed",
      confidence: "low",
      geocodeStatus,
      failCount: 1,
    });
  }

  const enriched = overlayCoordinatesOnRoutingStop(stop, {
    source: "fallback_unavailable",
    status: "failed",
    confidence: "low",
    geocodeStatus,
  });

  const stopIndex = enrichedStops.findIndex((candidate) => candidate.orderId === stop.orderId);
  if (stopIndex >= 0) {
    enrichedStops[stopIndex] = enriched;
  }

  stopCoordinates.push(
    buildStopCoordinateRecord(enriched, normalizedAddressKey, {
      source: "fallback_unavailable",
      status: "failed",
      confidence: "low",
      geocodeStatus,
    })
  );
}

async function applySuccessfulGeocodeResult(
  enrichedStops: RoutingStop[],
  stopCoordinates: DeliveryAgentStopCoordinateRecord[],
  entry: { stop: RoutingStop; normalizedAddressKey: string },
  result: RouteOptimizerGeocodeResultItem | undefined
): Promise<void> {
  const { stop, normalizedAddressKey } = entry;
  const lat = readFiniteCoordinate(result?.lat);
  const lng = readFiniteCoordinate(result?.lng);
  const geocodeStatus = result?.geocode_status ?? result?.error;
  const status =
    lat !== undefined && lng !== undefined
      ? mapGeocodeStatusToCoordinateStatus(result?.geocode_status)
      : "failed";

  if (lat !== undefined && lng !== undefined && status !== "failed") {
    const confidence = result ? mapGeocodeConfidence(result) : "medium";
    await writeGeocodeCacheEntry({
      normalizedAddressKey,
      formattedAddress: stop.formattedAddress,
      lat,
      lng,
      status,
      confidence,
      geocodeStatus: result?.geocode_status,
    });

    const enriched = overlayCoordinatesOnRoutingStop(stop, {
      lat,
      lng,
      source: "route_optimizer_geocode",
      status,
      confidence,
      geocodeStatus: result?.geocode_status ?? "OK",
    });

    const stopIndex = enrichedStops.findIndex((candidate) => candidate.orderId === stop.orderId);
    if (stopIndex >= 0) {
      enrichedStops[stopIndex] = enriched;
    }

    stopCoordinates.push(
      buildStopCoordinateRecord(enriched, normalizedAddressKey, {
        lat,
        lng,
        source: "route_optimizer_geocode",
        status,
        confidence,
        geocodeStatus: result?.geocode_status,
      })
    );
    return;
  }

  await applyGeocodeFallbackForPendingStop(enrichedStops, stopCoordinates, entry, geocodeStatus ?? "ZERO_RESULTS");
}

export type EnrichRoutingStopsResult = {
  stops: RoutingStop[];
  geocodeEnrichment: DeliveryAgentGeocodeEnrichment;
};

export async function enrichRoutingStops(input: {
  deliveryDate: string;
  stops: RoutingStop[];
  profileId?: string;
}): Promise<EnrichRoutingStopsResult> {
  const nowIso = new Date().toISOString();
  const alerts: GeocodeEnrichmentAlert[] = [];
  let cacheHits = 0;
  let roGeocodeRequested = 0;
  let roGeocodeSucceeded = 0;
  let roGeocodeFailed = 0;
  let endpointUrl: string | undefined;

  try {
    const { baseUrl } = getRouteOptimizerConfig();
    endpointUrl = buildRouteOptimizerUrl(baseUrl, ROUTE_OPTIMIZER_PATHS.geocodeAddresses);
  } catch {
    endpointUrl = undefined;
  }

  const addressKeys = input.stops.map((stop) => ({
    stop,
    normalizedAddressKey: buildNormalizedAddressKey(stop),
  }));

  const cacheByKey = await readGeocodeCacheBatch(addressKeys.map((entry) => entry.normalizedAddressKey));

  const enrichedStops: RoutingStop[] = [];
  const stopCoordinates: DeliveryAgentStopCoordinateRecord[] = [];
  const pendingGeocode: Array<{
    stop: RoutingStop;
    normalizedAddressKey: string;
  }> = [];

  for (const { stop, normalizedAddressKey } of addressKeys) {
    if (
      stop.coordinateSource === "order_data" ||
      (routingStopHasCoordinates(stop) && !stop.coordinateSource)
    ) {
      const lat = readFiniteCoordinate(stop.lat);
      const lng = readFiniteCoordinate(stop.lng);
      const enriched = overlayCoordinatesOnRoutingStop(stop, {
        lat,
        lng,
        source: "order_data",
        status: "ok",
        confidence: stop.coordinateConfidence ?? "high",
        geocodeStatus: "OK",
      });
      enrichedStops.push(enriched);
      stopCoordinates.push(
        buildStopCoordinateRecord(enriched, normalizedAddressKey, {
          lat,
          lng,
          source: "order_data",
          status: "ok",
          confidence: enriched.coordinateConfidence,
          geocodeStatus: "OK",
        })
      );
      continue;
    }

    const cached = cacheByKey.get(normalizedAddressKey);
    if (cached && cached.status !== "failed") {
      cacheHits += 1;
      const enriched = overlayCoordinatesOnRoutingStop(stop, {
        lat: cached.lat,
        lng: cached.lng,
        source: "delivery_agent_cache",
        status: cached.status,
        confidence: cached.confidence,
        geocodeStatus: cached.geocodeStatus,
      });
      enrichedStops.push(enriched);
      stopCoordinates.push(
        buildStopCoordinateRecord(enriched, normalizedAddressKey, {
          lat: cached.lat,
          lng: cached.lng,
          source: "delivery_agent_cache",
          status: cached.status,
          confidence: cached.confidence,
          geocodeStatus: cached.geocodeStatus,
        })
      );
      continue;
    }

    if (cached?.status === "failed") {
      const enriched = overlayCoordinatesOnRoutingStop(stop, {
        source: "fallback_unavailable",
        status: "failed",
        confidence: "low",
      });
      enrichedStops.push(enriched);
      stopCoordinates.push(
        buildStopCoordinateRecord(enriched, normalizedAddressKey, {
          source: "fallback_unavailable",
          status: "failed",
          confidence: "low",
          geocodeStatus: cached.geocodeStatus ?? "ZERO_RESULTS",
        })
      );
      continue;
    }

    pendingGeocode.push({ stop, normalizedAddressKey });
    enrichedStops.push(stop);
  }

  if (pendingGeocode.length > 0) {
    roGeocodeRequested = pendingGeocode.length;

    try {
      const response = await geocodeAddressesBatch({
        created_by_integration: "kapioo-admin",
        idempotency_key: buildGeocodeIdempotencyKey(
          input.deliveryDate,
          pendingGeocode.map((entry) => entry.stop.orderId)
        ),
        addresses: pendingGeocode.map(({ stop }) => ({
          client_ref: stop.orderId,
          address: stop.formattedAddress,
          area: stop.area,
          country: stop.deliveryAddress.country || "Canada",
        })),
      });

      const resultByOrderId = new Map(
        (response.results ?? []).map((result) => [result.client_ref, result])
      );

      const batchFailedOrderIds: string[] = [];

      for (const entry of pendingGeocode) {
        const result = resultByOrderId.get(entry.stop.orderId);
        const lat = readFiniteCoordinate(result?.lat);
        const lng = readFiniteCoordinate(result?.lng);
        const status =
          lat !== undefined && lng !== undefined
            ? mapGeocodeStatusToCoordinateStatus(result?.geocode_status)
            : "failed";

        if (lat !== undefined && lng !== undefined && status !== "failed") {
          roGeocodeSucceeded += 1;
        } else {
          roGeocodeFailed += 1;
          batchFailedOrderIds.push(entry.stop.orderId);
        }

        await applySuccessfulGeocodeResult(
          enrichedStops,
          stopCoordinates,
          entry,
          result
        );
      }

      const partialAlert = buildPartialGeocodeFailureAlert(batchFailedOrderIds);
      if (partialAlert) {
        alerts.push(partialAlert);
      }
    } catch (error) {
      if (error instanceof RouteOptimizerRateLimitError) {
        throw error;
      }

      const batchAlert = buildGeocodeBatchFailureAlert(error);
      alerts.push(batchAlert);

      const geocodeStatus =
        batchAlert.code === "endpoint_unavailable"
          ? "GEOCODE_ENDPOINT_UNAVAILABLE"
          : batchAlert.code === "auth_failed"
            ? "GEOCODE_AUTH_FAILED"
            : "GEOCODE_BATCH_FAILED";

      roGeocodeFailed = pendingGeocode.length;

      for (const entry of pendingGeocode) {
        await applyGeocodeFallbackForPendingStop(enrichedStops, stopCoordinates, entry, geocodeStatus, {
          writeCache: false,
        });
      }

      console.error("[Delivery Agent Geocode] batch request failed", {
        deliveryDate: input.deliveryDate,
        profileId: input.profileId,
        endpointPath: ROUTE_OPTIMIZER_PATHS.geocodeAddresses,
        endpointUrl,
        errorCode: batchAlert.code,
        httpStatus: error instanceof RouteOptimizerResponseError ? error.status : undefined,
      });
    }
  }

  const runStats: GeocodeEnrichmentRunStats = {
    totalStops: input.stops.length,
    cacheHits,
    roGeocodeRequested,
    roGeocodeSucceeded,
    roGeocodeFailed,
    endpointPath: ROUTE_OPTIMIZER_PATHS.geocodeAddresses,
    ...(endpointUrl ? { endpointUrl } : {}),
  };

  console.info("[Delivery Agent Geocode] enrichment complete", {
    deliveryDate: input.deliveryDate,
    profileId: input.profileId,
    ...runStats,
    alertCodes: alerts.map((alert) => alert.code),
  });

  const coordinateCoverage = buildCoordinateCoverageSummary({
    stops: input.stops,
    stopCoordinates,
    alerts: alerts.length > 0 ? alerts : undefined,
  });

  return {
    stops: enrichedStops,
    geocodeEnrichment: {
      artifactVersion: "1",
      enrichedAt: nowIso,
      provider: "route_optimizer",
      stopCoordinates,
      coordinateCoverage,
      runStats,
    },
  };
}

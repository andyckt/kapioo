import { isSyntheticMeetupOrderId } from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";
import { readGeocodeCacheBatch } from "@/lib/agents/delivery/geocode/geocode-cache";
import { buildNormalizedAddressKey } from "@/lib/agents/delivery/geocode/normalize-address-key";
import {
  overlayCoordinatesOnRoutingStop,
  readFiniteCoordinate,
  routingStopHasCoordinates,
} from "@/lib/agents/delivery/geocode/overlay-coordinates-on-routing-stop";
import type {
  DeliveryAgentGeocodeEnrichment,
  DeliveryAgentStopCoordinateRecord,
} from "@/lib/agents/delivery/geocode/types";
import type { FinalCreateCoordinateParitySummary } from "@/lib/agents/delivery/run-log-types";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type {
  DeliveryAgentCandidatePlanPreview,
  DeliveryAgentPreviewCandidatePlansResponse,
} from "@/lib/contracts/delivery-agent";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

export type FinalCreateMeetupCoordinates = {
  lat?: number;
  lng?: number;
  source?: DeliveryAgentStopCoordinateRecord["source"];
};

export type BuildEnrichedRoutingStopLookupResult = {
  routingStopByOrderId: Map<string, RoutingStop>;
  coordinateAudit: FinalCreateCoordinateParitySummary;
  meetupCoordinates?: FinalCreateMeetupCoordinates;
};

type CoordinateResolutionSource =
  | "run_geocode_enrichment"
  | "preview_snapshot_enrichment"
  | "delivery_agent_cache"
  | "address_only";

function collectRequiredOrderIds(finalAcceptedPlan: DeliveryAgentCandidatePlanPreview): string[] {
  const seen = new Set<string>();

  for (const run of finalAcceptedPlan.runs) {
    for (const stop of run.optimizedStops) {
      for (const orderId of stop.orderIds ?? []) {
        const trimmed = orderId.trim();
        if (trimmed && !isSyntheticMeetupOrderId(trimmed)) {
          seen.add(trimmed);
        }
      }
    }
  }

  return [...seen];
}

function readStopCoordinateIndex(
  enrichment: DeliveryAgentGeocodeEnrichment | undefined
): Map<string, DeliveryAgentStopCoordinateRecord> {
  const index = new Map<string, DeliveryAgentStopCoordinateRecord>();

  for (const record of enrichment?.stopCoordinates ?? []) {
    const orderId = record.orderId?.trim();
    if (!orderId) {
      continue;
    }

    index.set(orderId, record);
  }

  return index;
}

function readPreviewSnapshotEnrichment(
  run: IDeliveryAgentRun
): DeliveryAgentGeocodeEnrichment | undefined {
  const snapshot = run.planningArtifacts?.candidatePreviewSnapshot as
    | DeliveryAgentPreviewCandidatePlansResponse
    | undefined;

  return snapshot?.geocodeEnrichment;
}

function recordHasUsableCoordinates(record: DeliveryAgentStopCoordinateRecord | undefined): boolean {
  if (!record || record.status === "failed") {
    return false;
  }

  return (
    readFiniteCoordinate(record.lat) !== undefined && readFiniteCoordinate(record.lng) !== undefined
  );
}

function overlayFromStopRecord(
  stop: RoutingStop,
  record: DeliveryAgentStopCoordinateRecord
): RoutingStop {
  return overlayCoordinatesOnRoutingStop(stop, {
    lat: record.lat,
    lng: record.lng,
    source: record.source,
    status: record.status,
    confidence: record.confidence,
    geocodeStatus: record.geocodeStatus,
  });
}

function resolveCoordinateParity(input: {
  totalRealCustomerStops: number;
  withCoordinates: number;
  fromRunEnrichment: number;
  fromSnapshotEnrichment: number;
  fromCache: number;
}): FinalCreateCoordinateParitySummary["coordinateParity"] {
  if (input.totalRealCustomerStops === 0) {
    return "low";
  }

  if (input.withCoordinates === input.totalRealCustomerStops) {
    if (input.fromRunEnrichment + input.fromSnapshotEnrichment >= input.withCoordinates) {
      return "full";
    }

    return "partial";
  }

  if (input.withCoordinates === 0) {
    return "low";
  }

  return "partial";
}

export async function buildEnrichedRoutingStopLookup(input: {
  run: IDeliveryAgentRun;
  finalAcceptedPlan: DeliveryAgentCandidatePlanPreview;
  baseStops: RoutingStop[];
}): Promise<BuildEnrichedRoutingStopLookupResult> {
  const requiredOrderIds = collectRequiredOrderIds(input.finalAcceptedPlan);
  const baseByOrderId = new Map(input.baseStops.map((stop) => [stop.orderId, stop]));

  for (const orderId of requiredOrderIds) {
    if (!baseByOrderId.has(orderId)) {
      throw new FinalRouteCreatePayloadError(
        `Approved plan references order ${orderId}, but it is not in the current confirmed order set for ${input.run.deliveryDate}.`
      );
    }
  }

  const runEnrichmentIndex = readStopCoordinateIndex(input.run.geocodeEnrichment ?? undefined);
  const snapshotEnrichmentIndex = readPreviewSnapshotEnrichment(input.run);
  const snapshotIndex = readStopCoordinateIndex(snapshotEnrichmentIndex);

  const resolutionByOrderId = new Map<string, CoordinateResolutionSource>();
  const enrichedByOrderId = new Map<string, RoutingStop>();

  let fromGeocodeEnrichment = 0;
  let fromPreviewSnapshotEnrichment = 0;
  let fromCacheFallback = 0;
  let addressOnlyFallback = 0;
  const missingCoordinateOrderIds: string[] = [];

  for (const orderId of requiredOrderIds) {
    const baseStop = baseByOrderId.get(orderId)!;
    let enriched = baseStop;

    const runRecord = runEnrichmentIndex.get(orderId);
    if (recordHasUsableCoordinates(runRecord)) {
      enriched = overlayFromStopRecord(enriched, runRecord!);
      resolutionByOrderId.set(orderId, "run_geocode_enrichment");
      fromGeocodeEnrichment += 1;
    } else {
      const snapshotRecord = snapshotIndex.get(orderId);
      if (recordHasUsableCoordinates(snapshotRecord)) {
        enriched = overlayFromStopRecord(enriched, snapshotRecord!);
        resolutionByOrderId.set(orderId, "preview_snapshot_enrichment");
        fromPreviewSnapshotEnrichment += 1;
      }
    }

    enrichedByOrderId.set(orderId, enriched);
  }

  const cacheCandidates = requiredOrderIds.filter((orderId) => {
    const stop = enrichedByOrderId.get(orderId);
    return stop !== undefined && !routingStopHasCoordinates(stop);
  });

  if (cacheCandidates.length > 0) {
    const cacheKeys = cacheCandidates.map((orderId) =>
      buildNormalizedAddressKey(baseByOrderId.get(orderId)!)
    );
    const cacheEntries = await readGeocodeCacheBatch(cacheKeys);

    for (const orderId of cacheCandidates) {
      const baseStop = baseByOrderId.get(orderId)!;
      const cacheKey = buildNormalizedAddressKey(baseStop);
      const cacheEntry = cacheEntries.get(cacheKey);

      if (
        cacheEntry &&
        cacheEntry.status !== "failed" &&
        readFiniteCoordinate(cacheEntry.lat) !== undefined &&
        readFiniteCoordinate(cacheEntry.lng) !== undefined
      ) {
        enrichedByOrderId.set(
          orderId,
          overlayCoordinatesOnRoutingStop(baseStop, {
            lat: cacheEntry.lat,
            lng: cacheEntry.lng,
            source: "delivery_agent_cache",
            status: cacheEntry.status,
            confidence: cacheEntry.confidence,
            geocodeStatus: cacheEntry.geocodeStatus,
          })
        );
        resolutionByOrderId.set(orderId, "delivery_agent_cache");
        fromCacheFallback += 1;
      }
    }
  }

  for (const orderId of requiredOrderIds) {
    const stop = enrichedByOrderId.get(orderId)!;

    if (!routingStopHasCoordinates(stop)) {
      resolutionByOrderId.set(orderId, "address_only");
      addressOnlyFallback += 1;
      missingCoordinateOrderIds.push(orderId);
    }
  }

  const handoffActive =
    !input.finalAcceptedPlan.handoffPlan.handoffSkipped &&
    input.finalAcceptedPlan.handoffPlan.selectedMeetup;

  let syntheticStopCount = 0;
  let meetupCoordinates: FinalCreateMeetupCoordinates | undefined;

  if (handoffActive) {
    syntheticStopCount = 1;
    const meetup = input.finalAcceptedPlan.handoffPlan.selectedMeetup!;
    const sourceOrderId = meetup.sourceOrderId?.trim();

    if (sourceOrderId && enrichedByOrderId.has(sourceOrderId)) {
      const sourceStop = enrichedByOrderId.get(sourceOrderId)!;
      if (routingStopHasCoordinates(sourceStop)) {
        meetupCoordinates = {
          lat: sourceStop.lat,
          lng: sourceStop.lng,
          source: sourceStop.coordinateSource,
        };
      }
    }

    if (!meetupCoordinates && meetup.meetupAddress?.trim()) {
      const meetupKey = buildNormalizedAddressKey({
        formattedAddress: meetup.meetupAddress,
        area: meetup.sourceArea ?? "North York",
        deliveryAddress: {
          unitNumber: "",
          streetAddress: meetup.meetupAddress,
          city: "",
          province: "",
          postalCode: "",
          country: "",
          buzzCode: "",
        },
      });
      const cacheEntries = await readGeocodeCacheBatch([meetupKey]);
      const cacheEntry = cacheEntries.get(meetupKey);

      if (
        cacheEntry &&
        cacheEntry.status !== "failed" &&
        readFiniteCoordinate(cacheEntry.lat) !== undefined &&
        readFiniteCoordinate(cacheEntry.lng) !== undefined
      ) {
        meetupCoordinates = {
          lat: cacheEntry.lat,
          lng: cacheEntry.lng,
          source: "delivery_agent_cache",
        };
      }
    }
  }

  const withCoordinates = requiredOrderIds.filter((orderId) =>
    routingStopHasCoordinates(enrichedByOrderId.get(orderId)!)
  ).length;

  const coordinateAudit: FinalCreateCoordinateParitySummary = {
    totalRealCustomerStops: requiredOrderIds.length,
    fromGeocodeEnrichment,
    fromPreviewSnapshotEnrichment,
    fromCacheFallback,
    addressOnlyFallback,
    missingCoordinateOrderIds,
    syntheticStopCount,
    coordinateParity: resolveCoordinateParity({
      totalRealCustomerStops: requiredOrderIds.length,
      withCoordinates,
      fromRunEnrichment: fromGeocodeEnrichment,
      fromSnapshotEnrichment: fromPreviewSnapshotEnrichment,
      fromCache: fromCacheFallback,
    }),
  };

  const routingStopByOrderId = new Map<string, RoutingStop>(baseByOrderId);
  for (const [orderId, stop] of enrichedByOrderId) {
    routingStopByOrderId.set(orderId, stop);
  }

  return {
    routingStopByOrderId,
    coordinateAudit,
    meetupCoordinates,
  };
}

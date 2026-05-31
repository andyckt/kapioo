import connectToDatabase from "@/lib/db";
import DeliveryAgentGeocodeCache from "@/models/DeliveryAgentGeocodeCache";

import {
  GEOCODE_CACHE_FAILURE_TTL_MS,
  GEOCODE_CACHE_SUCCESS_TTL_MS,
  type CoordinateConfidence,
  type CoordinateStatus,
} from "@/lib/agents/delivery/geocode/types";

export type GeocodeCacheEntry = {
  normalizedAddressKey: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  status: CoordinateStatus;
  confidence?: CoordinateConfidence;
  geocodeStatus?: string;
  geocodedAt: Date;
};

export async function readGeocodeCacheBatch(
  keys: string[]
): Promise<Map<string, GeocodeCacheEntry>> {
  if (keys.length === 0) {
    return new Map();
  }

  await connectToDatabase();
  const now = new Date();
  const uniqueKeys = [...new Set(keys)];

  const entries = await DeliveryAgentGeocodeCache.find({
    normalizedAddressKey: { $in: uniqueKeys },
    expiresAt: { $gt: now },
  }).lean();

  const result = new Map<string, GeocodeCacheEntry>();

  for (const entry of entries) {
    result.set(entry.normalizedAddressKey, {
      normalizedAddressKey: entry.normalizedAddressKey,
      formattedAddress: entry.formattedAddress,
      lat: entry.lat,
      lng: entry.lng,
      status: entry.status,
      confidence: entry.confidence,
      geocodeStatus: entry.geocodeStatus,
      geocodedAt: entry.geocodedAt,
    });
  }

  return result;
}

export async function writeGeocodeCacheEntry(input: {
  normalizedAddressKey: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  status: CoordinateStatus;
  confidence?: CoordinateConfidence;
  geocodeStatus?: string;
  failCount?: number;
}): Promise<void> {
  await connectToDatabase();
  const now = new Date();
  const ttlMs =
    input.status === "failed"
      ? GEOCODE_CACHE_FAILURE_TTL_MS
      : GEOCODE_CACHE_SUCCESS_TTL_MS;

  await DeliveryAgentGeocodeCache.findOneAndUpdate(
    { normalizedAddressKey: input.normalizedAddressKey },
    {
      $set: {
        formattedAddress: input.formattedAddress,
        lat: input.lat,
        lng: input.lng,
        status: input.status,
        confidence: input.confidence,
        provider: "route_optimizer",
        geocodeStatus: input.geocodeStatus,
        geocodedAt: now,
        expiresAt: new Date(now.getTime() + ttlMs),
        failCount: input.failCount ?? (input.status === "failed" ? 1 : 0),
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Isomorphic geometry helpers for polygon-based delivery zone validation.
 *
 * This is the single source of truth for:
 *  - GeoJSON polygon types used in zone definitions
 *  - Point-in-polygon containment check
 *  - Axis-order helper (lat/lng → GeoJSON [lng, lat])
 *  - Registry geometry validator (catches bad pastes in CI)
 *
 * Works in both Node.js (server) and browser (client).
 */

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

// GeoJSON coordinate ring: array of [lng, lat] pairs (GeoJSON spec, longitude first)
export type GeoCoordinate = [number, number];
export type GeoRing = GeoCoordinate[];

export type GeoPolygon = {
  type: "Polygon";
  coordinates: GeoRing[];
};

export type GeoMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoRing[][];
};

export type PolygonGeometry = GeoPolygon | GeoMultiPolygon;

/**
 * Build a GeoJSON [lng, lat] point from lat/lng values.
 * This is the ONLY place the axis order is written — all call sites use this
 * helper so that no consumer can accidentally swap the coordinates.
 */
export function pointFromLatLng(lat: number, lng: number): ReturnType<typeof point> {
  // GeoJSON spec: coordinates are [longitude, latitude]
  return point([lng, lat]);
}

/**
 * Returns true if the given lat/lng falls inside (or on the boundary of)
 * the provided GeoJSON polygon or multi-polygon geometry.
 *
 * @turf/boolean-point-in-polygon treats boundary points as inside.
 */
export function isPointInGeometry(lat: number, lng: number, geometry: PolygonGeometry): boolean {
  const pt = pointFromLatLng(lat, lng);
  return booleanPointInPolygon(pt, geometry as Parameters<typeof booleanPointInPolygon>[1]);
}

// Approximate bounding box for Canada (generous, catches obvious pastes in wrong country)
const CANADA_BOUNDS = {
  minLng: -141.0,
  maxLng: -52.0,
  minLat: 41.6,
  maxLat: 83.0,
};

function isCoordInCanadaBounds([lng, lat]: GeoCoordinate): boolean {
  return (
    lng >= CANADA_BOUNDS.minLng &&
    lng <= CANADA_BOUNDS.maxLng &&
    lat >= CANADA_BOUNDS.minLat &&
    lat <= CANADA_BOUNDS.maxLat
  );
}

function validateRing(ring: GeoRing): string[] {
  const errors: string[] = [];
  if (ring.length < 4) {
    errors.push(`Ring has fewer than 4 points (${ring.length}); cannot form a closed polygon`);
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    errors.push("Ring is not closed (first and last coordinate must be identical)");
  }
  for (const coord of ring) {
    if (!isCoordInCanadaBounds(coord)) {
      errors.push(`Coordinate [${coord}] is outside Canada bounds — check for lat/lng swap or wrong country`);
      break;
    }
  }
  return errors;
}

/**
 * Validates a polygon geometry for common mistakes:
 *   - Unclosed rings
 *   - Too few points
 *   - Coordinates outside Canada's bounding box (catches lat/lng swaps)
 *
 * Returns an array of error strings. Empty array means valid.
 * Use this in tests to guard against bad GeoJSON pastes reaching production.
 */
export function validateGeometry(geometry: PolygonGeometry): string[] {
  const errors: string[] = [];

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring, i) => {
      const ringErrors = validateRing(ring);
      ringErrors.forEach((e) => errors.push(`Polygon ring[${i}]: ${e}`));
    });
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon, pi) => {
      polygon.forEach((ring, ri) => {
        const ringErrors = validateRing(ring);
        ringErrors.forEach((e) => errors.push(`MultiPolygon[${pi}] ring[${ri}]: ${e}`));
      });
    });
  } else {
    errors.push(`Unknown geometry type: ${(geometry as { type: string }).type}`);
  }

  return errors;
}

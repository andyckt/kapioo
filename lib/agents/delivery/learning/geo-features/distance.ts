import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  return haversineDistanceKm(a, b) * 1000;
}

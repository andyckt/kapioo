import { haversineDistanceKm } from "@/lib/agents/delivery/learning/geo-features/distance";
import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

export function computeSpreadKm(points: GeoPoint[]): { northSouth: number; eastWest: number } | null {
  if (points.length < 2) {
    return null;
  }

  let minLat = points[0]!.lat;
  let maxLat = points[0]!.lat;
  let minLng = points[0]!.lng;
  let maxLng = points[0]!.lng;

  for (const point of points.slice(1)) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const northSouth = haversineDistanceKm(
    { lat: minLat, lng: centerLng },
    { lat: maxLat, lng: centerLng }
  );
  const eastWest = haversineDistanceKm(
    { lat: centerLat, lng: minLng },
    { lat: centerLat, lng: maxLng }
  );

  return { northSouth, eastWest };
}

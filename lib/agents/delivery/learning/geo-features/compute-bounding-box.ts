import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

export function computeBoundingBox(points: GeoPoint[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  if (points.length === 0) {
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

  return { minLat, maxLat, minLng, maxLng };
}

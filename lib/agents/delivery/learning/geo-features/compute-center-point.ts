import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

export function computeCenterPoint(points: GeoPoint[]): GeoPoint | null {
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat,
      lng: accumulator.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

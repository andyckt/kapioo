export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function manhattanDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) * 0.5;
}

export function distanceToPoints(distance: number, maxDistance: number): number {
  return clamp(100 - (distance / maxDistance) * 100, 0, 100);
}

export function readCoordinate(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function hasLatLng(point: { lat?: number; lng?: number }): boolean {
  return typeof point.lat === "number" && typeof point.lng === "number";
}

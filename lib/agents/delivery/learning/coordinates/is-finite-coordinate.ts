export function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasFiniteLatLng(input: { lat?: unknown; lng?: unknown }): boolean {
  return isFiniteCoordinate(input.lat) && isFiniteCoordinate(input.lng);
}

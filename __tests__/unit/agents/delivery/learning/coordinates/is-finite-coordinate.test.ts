import {
  hasFiniteLatLng,
  isFiniteCoordinate,
} from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";

describe("isFiniteCoordinate", () => {
  it("accepts finite numbers", () => {
    expect(isFiniteCoordinate(43.65)).toBe(true);
    expect(isFiniteCoordinate(0)).toBe(true);
    expect(isFiniteCoordinate(-79.38)).toBe(true);
  });

  it("rejects NaN, Infinity, string, null, and undefined", () => {
    expect(isFiniteCoordinate(Number.NaN)).toBe(false);
    expect(isFiniteCoordinate(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteCoordinate("43.65")).toBe(false);
    expect(isFiniteCoordinate(null)).toBe(false);
    expect(isFiniteCoordinate(undefined)).toBe(false);
  });
});

describe("hasFiniteLatLng", () => {
  it("requires both finite lat and lng", () => {
    expect(hasFiniteLatLng({ lat: 43.65, lng: -79.38 })).toBe(true);
    expect(hasFiniteLatLng({ lat: 43.65, lng: Number.NaN })).toBe(false);
    expect(hasFiniteLatLng({ lat: null, lng: -79.38 })).toBe(false);
    expect(hasFiniteLatLng({})).toBe(false);
  });
});

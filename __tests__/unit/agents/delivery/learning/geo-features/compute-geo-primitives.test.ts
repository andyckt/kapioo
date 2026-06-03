import { computeBoundingBox } from "@/lib/agents/delivery/learning/geo-features/compute-bounding-box";
import { computeCenterPoint } from "@/lib/agents/delivery/learning/geo-features/compute-center-point";
import { computeSpreadKm } from "@/lib/agents/delivery/learning/geo-features/compute-spread-km";

describe("computeBoundingBox", () => {
  it("returns null for no points", () => {
    expect(computeBoundingBox([])).toBeNull();
  });

  it("computes min/max lat/lng", () => {
    expect(
      computeBoundingBox([
        { lat: 43.65, lng: -79.4 },
        { lat: 43.7, lng: -79.3 },
        { lat: 43.68, lng: -79.35 },
      ])
    ).toEqual({
      minLat: 43.65,
      maxLat: 43.7,
      minLng: -79.4,
      maxLng: -79.3,
    });
  });
});

describe("computeCenterPoint", () => {
  it("returns null for no points", () => {
    expect(computeCenterPoint([])).toBeNull();
  });

  it("averages lat/lng", () => {
    const center = computeCenterPoint([
      { lat: 43.6, lng: -79.4 },
      { lat: 43.8, lng: -79.2 },
    ]);
    expect(center?.lat).toBeCloseTo(43.7);
    expect(center?.lng).toBeCloseTo(-79.3);
  });
});

describe("computeSpreadKm", () => {
  it("returns null for fewer than 2 points", () => {
    expect(computeSpreadKm([{ lat: 43.65, lng: -79.38 }])).toBeNull();
  });

  it("returns positive spread values for multiple points", () => {
    const spread = computeSpreadKm([
      { lat: 43.65, lng: -79.45 },
      { lat: 43.75, lng: -79.32 },
    ]);

    expect(spread).not.toBeNull();
    expect(spread!.northSouth).toBeGreaterThan(0);
    expect(spread!.eastWest).toBeGreaterThan(0);
  });
});

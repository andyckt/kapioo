import { haversineDistanceKm } from "@/lib/agents/delivery/learning/geo-features/distance";

describe("haversineDistanceKm", () => {
  it("returns 0 for the same point", () => {
    const point = { lat: 43.6532, lng: -79.3832 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it("returns an approximate GTA distance for nearby points", () => {
    const downtown = { lat: 43.6532, lng: -79.3832 };
    const northYork = { lat: 43.7, lng: -79.38 };
    const distance = haversineDistanceKm(downtown, northYork);

    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(7);
  });
});

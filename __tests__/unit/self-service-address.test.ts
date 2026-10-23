import { resolveAddress } from "@/lib/self-service/address";

const fetchMock = vi.fn();
function geocode(location: unknown) {
  return { status: "OK", results: [{ place_id: "verified-place", formatted_address: "123 King St W, Toronto, ON M5V 1J1, Canada", geometry: { location }, address_components: [
    { long_name: "123", types: ["street_number"] }, { long_name: "King St W", types: ["route"] },
    { long_name: "Toronto", types: ["locality"] }, { long_name: "M5V 1J1", types: ["postal_code"] },
    { long_name: "Canada", short_name: "CA", types: ["country"] },
  ] }] };
}
describe("server address verification for self-service", () => {
  beforeEach(() => { vi.stubEnv("GOOGLE_GEOCODING_API_KEY", "test-key"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("uses verified coordinates and postcode while preserving unit and buzzer", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(geocode({ lat: 43.65, lng: -79.39 }))));
    const result = await resolveAddress({ placeId: "verified-place", unitNumber: "203", buzzCode: "456" });
    expect(result.addressGeo.lat).toBe(43.65);
    expect(result.coverage.canDaily).toBe(true); expect(result.coverage.canWeekly).toBe(true);
    expect(result.address.unitNumber).toBe("203"); expect(result.address.buzzCode).toBe("456");
  });
  it.each([undefined, { lng: -79.39 }, { lat: 91, lng: -79.39 }, { lat: 43.65, lng: -181 }])("rejects missing or invalid coordinates instead of using city-name coverage", async location => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(geocode(location))));
    await expect(resolveAddress({ placeId: "verified-place" })).rejects.toThrow(/complete Canadian street address/);
  });
});

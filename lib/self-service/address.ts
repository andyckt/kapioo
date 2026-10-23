import { ApiError } from "@/lib/api/errors";
import { parseGooglePlaceToAddress } from "@/lib/address/parse-google-place";
import { resolveServiceability } from "@/lib/zones/service-areas";

/** Resolve on the server; browser coordinates and coverage flags are not authority. */
export async function resolveAddress(choice: { placeId: string; unitNumber?: string; buzzCode?: string }) {
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) throw new ApiError("Address verification is temporarily unavailable. Please contact support.", { status: 503 });
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("place_id", choice.placeId);
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new ApiError("Could not verify this address", { status: 503 });
  const json = await response.json();
  const result = json.status === "OK" ? json.results?.[0] : null;
  if (!result || result.partial_match) throw new ApiError("Please select a complete street address.");
  const parsed = parseGooglePlaceToAddress({
    id: result.place_id, formatted_address: result.formatted_address,
    address_components: result.address_components, location: result.geometry?.location,
  });
  if (!parsed.addressGeo.streetNumber || !parsed.addressGeo.postalCode || !["CA", "Canada"].includes(parsed.addressGeo.country || "") ||
    !Number.isFinite(parsed.addressGeo.lat) || !Number.isFinite(parsed.addressGeo.lng) ||
    Math.abs(parsed.addressGeo.lat!) > 90 || Math.abs(parsed.addressGeo.lng!) > 180) {
    throw new ApiError("Please select a complete Canadian street address.");
  }
  parsed.address.unitNumber = choice.unitNumber || "";
  parsed.address.buzzCode = choice.buzzCode || "";
  const coverage = resolveServiceability({
    areaLabel: parsed.address.province, postalCode: parsed.addressGeo.postalCode,
    lat: parsed.addressGeo.lat, lng: parsed.addressGeo.lng,
  });
  return { ...parsed, coverage };
}

import type { Address } from "@/lib/contracts/common";

import type {
  GoogleAddressComponentLike,
  GooglePlaceLike,
  ParsedGoogleAddress,
} from "./types";

function readComponentText(component: GoogleAddressComponentLike | undefined, short = false) {
  if (!component) return "";
  return short
    ? component.shortText || component.short_name || component.longText || component.long_name || ""
    : component.longText || component.long_name || component.shortText || component.short_name || "";
}

function findComponent(
  components: GoogleAddressComponentLike[],
  type: string
): GoogleAddressComponentLike | undefined {
  return components.find((component) => component.types?.includes(type));
}

function readCoordinate(value: number | (() => number) | undefined) {
  if (typeof value === "function") {
    return value();
  }
  return typeof value === "number" ? value : undefined;
}

export function buildManualAddressGeo(address: Address) {
  const streetAddress = address.streetAddress?.trim() || "";
  const locality = address.city?.trim() || address.province?.trim() || "";
  const postalCode = address.postalCode?.trim() || "";
  const country = address.country?.trim() || "Canada";

  return {
    formattedAddress: [streetAddress, locality, postalCode, country].filter(Boolean).join(", "),
    postalCode,
    country,
    source: "manual" as const,
  };
}

export function parseGooglePlaceToAddress(place: GooglePlaceLike): ParsedGoogleAddress {
  const components = place.addressComponents || place.address_components || [];
  const streetNumber = readComponentText(findComponent(components, "street_number"));
  const route = readComponentText(findComponent(components, "route"));
  const locality =
    readComponentText(findComponent(components, "locality")) ||
    readComponentText(findComponent(components, "sublocality")) ||
    readComponentText(findComponent(components, "postal_town"));
  const administrativeArea = readComponentText(
    findComponent(components, "administrative_area_level_1"),
    true
  );
  const postalCode = readComponentText(findComponent(components, "postal_code"));
  const country = readComponentText(findComponent(components, "country")) || "Canada";
  const formattedAddress = place.formattedAddress || place.formatted_address || "";
  const lat = readCoordinate(place.location?.lat);
  const lng = readCoordinate(place.location?.lng);
  const streetAddress = [streetNumber, route].filter(Boolean).join(" ") || formattedAddress;

  return {
    address: {
      streetAddress,
      postalCode,
      country,
      city: locality,
    },
    addressGeo: {
      placeId: place.id,
      formattedAddress,
      lat,
      lng,
      streetNumber,
      route,
      locality,
      administrativeArea,
      postalCode,
      country,
      source: "google",
    },
  };
}

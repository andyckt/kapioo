import type { Address } from "@/lib/contracts/common";

import type {
  GoogleAddressComponentLike,
  GooglePlaceLike,
  ParsedGoogleAddress,
} from "./types";

// Maps lowercase locality / sublocality names → Kapioo area labels.
// Covers cities outside Toronto that have a direct 1-to-1 mapping.
const LOCALITY_AREA_MAP: Record<string, string> = {
  "markham": "Markham",
  "richmond hill": "Richmond Hill",
  "north york": "North York",
  "scarborough": "Scarborough",
  "east york": "East York",
  "etobicoke": "Etobicoke",
  "york": "York",
  "thornhill": "Thornhill",
  "aurora": "Aurora",
  "newmarket": "Newmarket",
  "brampton": "Brampton",
  "mississauga": "Mississauga",
  "oakville": "Oakville",
  "hamilton": "Hamilton",
  "burlington": "Burlington",
  "vaughan": "Vaughan (including Maple, Concord, King)",
  "maple": "Vaughan (including Maple, Concord, King)",
  "concord": "Vaughan (including Maple, Concord, King)",
  "woodbridge": "Vaughan (including Maple, Concord, King)",
  "king city": "Vaughan (including Maple, Concord, King)",
};

// Neighbourhood / sublocality names that Google returns for Toronto addresses.
// Priority: checked BEFORE the FSA postal-code table so fine-grained names win.
const TORONTO_NEIGHBORHOOD_AREA_MAP: Record<string, string> = {
  // Downtown Toronto neighbourhoods (south of / around Bloor, "Old Toronto" municipality)
  "old toronto": "Downtown Toronto",
  "church-wellesley village": "Downtown Toronto",
  "church-wellesley": "Downtown Toronto",
  "wellesley": "Downtown Toronto",
  "yorkville": "Downtown Toronto",
  "bloor-yorkville": "Downtown Toronto",
  "bay street corridor": "Downtown Toronto",
  "financial district": "Downtown Toronto",
  "entertainment district": "Downtown Toronto",
  "king west": "Downtown Toronto",
  "king-spadina": "Downtown Toronto",
  "waterfront communities": "Downtown Toronto",
  "harbourfront": "Downtown Toronto",
  "st. lawrence": "Downtown Toronto",
  "corktown": "Downtown Toronto",
  "distillery district": "Downtown Toronto",
  "regent park": "Downtown Toronto",
  "moss park": "Downtown Toronto",
  "kensington market": "Downtown Toronto",
  "kensington-chinatown": "Downtown Toronto",
  "chinatown": "Downtown Toronto",
  "alexandra park": "Downtown Toronto",
  "university": "Downtown Toronto",
  "trinity-bellwoods": "Downtown Toronto",
  "west queen west": "Downtown Toronto",
  "queen west": "Downtown Toronto",
  "liberty village": "Downtown Toronto",
  "parkdale": "Downtown Toronto",
  // Midtown neighbourhoods
  "rosedale": "Midtown",
  "moore park": "Midtown",
  "summerhill": "Midtown",
  "davisville village": "Midtown",
  "yonge-eglinton": "Midtown",
  "midtown": "Midtown",
  "mount pleasant": "Midtown",
  "forest hill": "Midtown",
  "annex": "Midtown",
  "seaton village": "Midtown",
  "casa loma": "Midtown",
  "wychwood": "Midtown",
  "christie pits": "Midtown",
  "bloorcourt village": "Midtown",
  "dufferin grove": "Midtown",
  "little italy": "Midtown",
  "bickford park": "Midtown",
  // North York neighbourhoods
  "willowdale": "North York",
  "don mills": "North York",
  "york mills": "North York",
  "lawrence park": "North York",
  "bedford park": "North York",
  "lawrence manor": "North York",
  "amesbury": "North York",
  "jane and finch": "North York",
  "black creek": "North York",
  // East York neighbourhoods
  "leslieville": "East York",
  "riverdale": "East York",
  "broadview north": "East York",
  "playter estates": "East York",
  "danforth": "East York",
  "greektown": "East York",
  "the beach": "East York",
  "beaches": "East York",
  "upper beaches": "East York",
  // York neighbourhoods
  "roncesvalles": "York",
  "junction": "York",
  "the junction": "York",
  "bloor west village": "York",
  "baby point": "York",
  "swansea": "York",
  "high park": "York",
  "lambton baby point": "York",
  "mount dennis": "York",
  // Etobicoke neighbourhoods
  "mimico": "Etobicoke",
  "long branch": "Etobicoke",
  "new toronto": "Etobicoke",
  "alderwood": "Etobicoke",
  "islington": "Etobicoke",
  "islington-city centre west": "Etobicoke",
  "richview": "Etobicoke",
  "humber heights": "Etobicoke",
  // Scarborough neighbourhoods
  "agincourt": "Scarborough",
  "malvern": "Scarborough",
  "rouge": "Scarborough",
  "highland creek": "Scarborough",
  "west hill": "Scarborough",
  "guildwood": "Scarborough",
  "cliffcrest": "Scarborough",
  "birchcliffe": "Scarborough",
  "cliffside": "Scarborough",
};

// FSA (first 3 chars of Canadian postal code) → Kapioo area.
// Used as a fallback when no locality/sublocality/neighbourhood name matched.
//
// Toronto postal codes (all start with "M") by sub-area:
//   Downtown Toronto:  south of Bloor, includes Yorkville/Church-Wellesley
//   Midtown:           Bloor to ~Lawrence, between ravines
//   North York:        M2* and M3* codes
//   East York:         M4G–M4M
//   York:              M6A–M6S
//   Scarborough:       M1*
//   Etobicoke:         M8* and M9*
const TORONTO_FSA_AREA_MAP: Record<string, string> = {
  // ── Downtown Toronto ────────────────────────────────────────────────────────
  // Old Toronto core / waterfront
  M5A: "Downtown Toronto", M5B: "Downtown Toronto", M5C: "Downtown Toronto",
  M5E: "Downtown Toronto", M5G: "Downtown Toronto", M5H: "Downtown Toronto",
  M5J: "Downtown Toronto", M5K: "Downtown Toronto", M5L: "Downtown Toronto",
  M5T: "Downtown Toronto", M5V: "Downtown Toronto", M5X: "Downtown Toronto",
  // Yorkville / Bloor-Yonge / Bay corridor (north side of downtown core)
  M4W: "Downtown Toronto",
  // Church-Wellesley / Wellesley-Yonge (south of Bloor) — was incorrectly Midtown
  M4Y: "Downtown Toronto",
  // East downtown (Sherbourne / Carlton / Cabbagetown south)
  M4X: "Downtown Toronto",
  // ── Midtown ─────────────────────────────────────────────────────────────────
  // Yonge/Davisville, Yonge/Eglinton, Forest Hill, Annex, Rosedale, Casa Loma
  M4N: "Midtown", M4P: "Midtown", M4R: "Midtown", M4S: "Midtown",
  M4T: "Midtown", M4V: "Midtown",
  M5N: "Midtown", M5P: "Midtown", M5R: "Midtown",
  M6G: "Midtown", M6H: "Midtown",
  // ── North York ──────────────────────────────────────────────────────────────
  M2M: "North York", M2N: "North York", M2P: "North York", M2R: "North York",
  M3A: "North York", M3B: "North York", M3C: "North York", M3H: "North York",
  M3J: "North York", M3K: "North York", M3L: "North York", M3M: "North York",
  M3N: "North York",
  // ── East York ───────────────────────────────────────────────────────────────
  M4G: "East York", M4H: "East York", M4J: "East York",
  M4K: "East York", M4L: "East York", M4M: "East York",
  // ── York ────────────────────────────────────────────────────────────────────
  M6A: "York", M6B: "York", M6C: "York", M6D: "York", M6E: "York",
  M6J: "York", M6K: "York", M6L: "York", M6M: "York", M6N: "York",
  M6P: "York", M6R: "York", M6S: "York",
  // ── Scarborough ─────────────────────────────────────────────────────────────
  M1B: "Scarborough", M1C: "Scarborough", M1E: "Scarborough", M1G: "Scarborough",
  M1H: "Scarborough", M1J: "Scarborough", M1K: "Scarborough", M1L: "Scarborough",
  M1M: "Scarborough", M1N: "Scarborough", M1P: "Scarborough", M1R: "Scarborough",
  M1S: "Scarborough", M1T: "Scarborough", M1V: "Scarborough", M1W: "Scarborough",
  M1X: "Scarborough",
  // ── Etobicoke ───────────────────────────────────────────────────────────────
  M8W: "Etobicoke", M8X: "Etobicoke", M8Y: "Etobicoke", M8Z: "Etobicoke",
  M9A: "Etobicoke", M9B: "Etobicoke", M9C: "Etobicoke", M9P: "Etobicoke",
  M9R: "Etobicoke", M9V: "Etobicoke", M9W: "Etobicoke",
};

function inferKapiooArea(components: GoogleAddressComponentLike[], postalCode: string): string {
  const locality   = readComponentText(findComponent(components, "locality")).toLowerCase().trim();
  const sub1       = readComponentText(findComponent(components, "sublocality_level_1")).toLowerCase().trim();
  const sub2       = readComponentText(findComponent(components, "sublocality_level_2")).toLowerCase().trim();
  const sub3       = readComponentText(findComponent(components, "sublocality_level_3")).toLowerCase().trim();
  const neighborhood = readComponentText(findComponent(components, "neighborhood")).toLowerCase().trim();

  // 1. Direct locality match — cities outside Toronto with unambiguous names.
  if (locality && locality !== "toronto" && LOCALITY_AREA_MAP[locality]) {
    return LOCALITY_AREA_MAP[locality];
  }

  // 2. Sublocality match — Google often returns "North York", "Scarborough" etc.
  //    at sublocality_level_1 for Toronto's amalgamated boroughs.
  for (const name of [sub1, sub2, sub3]) {
    if (name && name !== "toronto" && LOCALITY_AREA_MAP[name]) {
      return LOCALITY_AREA_MAP[name];
    }
  }

  // 3. Neighbourhood / fine-grained sublocality match (higher accuracy than FSA).
  //    Checked before the FSA table so specific names win over broad postal zones.
  for (const name of [neighborhood, sub1, sub2, sub3]) {
    if (name && TORONTO_NEIGHBORHOOD_AREA_MAP[name]) {
      return TORONTO_NEIGHBORHOOD_AREA_MAP[name];
    }
  }

  // 4. FSA (first 3 chars of postal code) fallback for Toronto addresses.
  const isToronto = locality === "toronto" || sub1 === "toronto" || !locality;
  if (isToronto && postalCode) {
    const fsa = postalCode.replace(/\s/g, "").substring(0, 3).toUpperCase();
    if (TORONTO_FSA_AREA_MAP[fsa]) {
      return TORONTO_FSA_AREA_MAP[fsa];
    }
  }

  return "";
}

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
  const inferredArea = inferKapiooArea(components, postalCode);

  return {
    address: {
      streetAddress,
      postalCode,
      country,
      city: locality,
      ...(inferredArea ? { province: inferredArea } : {}),
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

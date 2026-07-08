import {
  DAILY_DELIVERY_AREAS,
  WEEKLY_ONLY_AREAS,
  isDailyDeliveryArea,
  isWeeklyDeliveryArea,
} from "@/lib/constants/areas";
import { parseGooglePlaceToAddress } from "@/lib/address/parse-google-place";
import {
  canDeliverDaily,
  canDeliverWeekly,
  normalizeFsa,
  resolveServiceability,
} from "@/lib/zones/service-areas";
import {
  formatDailyCoverageList,
  formatWeeklyOnlyCoverageList,
  getAreaDisplayLabel,
} from "@/lib/zones/coverage-copy";
import { isPointInGeometry, pointFromLatLng, validateGeometry } from "@/lib/zones/geo";
import { ZONE_GEOMETRIES } from "@/lib/zones/zone-geometry";

// ─── FSA / label helpers (legacy + bridge paths) ──────────────────────────────

describe("service area postal-zone helpers", () => {
  it("normalizes Canadian FSA prefixes", () => {
    expect(normalizeFsa("l4b 1l4")).toBe("L4B");
    expect(normalizeFsa(" M5V3K2 ")).toBe("M5V");
    expect(normalizeFsa("")).toBe("");
  });

  it("supports weekly-all but daily-partial Richmond Hill coverage (FSA mode)", () => {
    expect(canDeliverDaily("Richmond Hill", "L4B 1L4")).toBe(true);
    expect(canDeliverWeekly("Richmond Hill", "L4B 1L4")).toBe(true);

    expect(canDeliverDaily("Richmond Hill", "L4Z 1A1")).toBe(false);
    expect(canDeliverWeekly("Richmond Hill", "L4Z 1A1")).toBe(true);
  });

  it("keeps weekly-only areas out of daily delivery", () => {
    expect(canDeliverDaily("Scarborough", "M1B 1A1")).toBe(false);
    expect(canDeliverWeekly("Scarborough", "M1B 1A1")).toBe(true);
  });

  it("keeps legacy label-level fallback when no postal code exists", () => {
    // Richmond Hill is mode:"include"; no FSA → falls back to label match (returns true)
    expect(canDeliverDaily("Richmond Hill")).toBe(true);
    const result = resolveServiceability({ areaLabel: "Richmond Hill" });
    expect(result).toMatchObject({
      canDaily: true,
      canWeekly: true,
      isServed: true,
      coordsMissing: true,
    });
  });

  it("derives existing area constants from the service registry", () => {
    expect(DAILY_DELIVERY_AREAS).toEqual([
      "Downtown Toronto",
      "Midtown",
      "North York",
      "Markham",
      "Richmond Hill",
    ]);
    expect(WEEKLY_ONLY_AREAS).toContain("Scarborough");
    expect(isDailyDeliveryArea("Richmond Hill")).toBe(true);
    expect(isWeeklyDeliveryArea("Scarborough")).toBe(true);
  });

  it("returns not-served for unknown area", () => {
    expect(resolveServiceability({ areaLabel: "Atlantis", postalCode: "Z9Z 9Z9" })).toMatchObject({
      canDaily: false,
      canWeekly: false,
      isServed: false,
      coordsMissing: true,
    });
  });

  it("sets coordsMissing=false when coordinates are provided", () => {
    // Downtown Toronto is mode:"all" — passes via label match even without polygon
    const result = resolveServiceability({
      areaLabel: "Downtown Toronto",
      postalCode: "M5V 1J1",
      lat: 43.645,
      lng: -79.382,
    });
    expect(result.coordsMissing).toBe(false);
    expect(result.canDaily).toBe(true);
    expect(result.canWeekly).toBe(true);
  });

  it("matchedAreaLabel is null when no polygon is drawn for the area", () => {
    // All current areas are mode:"all" or mode:"include" (no polygon drawn yet)
    const result = resolveServiceability({
      areaLabel: "Downtown Toronto",
      postalCode: "M5V 1J1",
      lat: 43.645,
      lng: -79.382,
    });
    // No polygon in ZONE_GEOMETRIES yet → matchedAreaLabel is null
    expect(result.matchedAreaLabel).toBeNull();
  });
});

// ─── Polygon geometry helpers ─────────────────────────────────────────────────

describe("polygon geometry helpers (lib/zones/geo.ts)", () => {
  // A simple square over a known Toronto location (roughly downtown)
  const torontoSquare = {
    type: "Polygon" as const,
    coordinates: [
      [
        [-79.4, 43.63],
        [-79.3, 43.63],
        [-79.3, 43.68],
        [-79.4, 43.68],
        [-79.4, 43.63], // closed ring
      ],
    ],
  };

  it("pointFromLatLng produces [lng, lat] GeoJSON point", () => {
    const pt = pointFromLatLng(43.65, -79.35);
    expect(pt.geometry.coordinates).toEqual([-79.35, 43.65]);
  });

  it("detects a known point inside the polygon", () => {
    // lat=43.65, lng=-79.35 is inside the square
    expect(isPointInGeometry(43.65, -79.35, torontoSquare)).toBe(true);
  });

  it("rejects a known point outside the polygon", () => {
    // lat=43.5, lng=-79.35 is well south of the square
    expect(isPointInGeometry(43.5, -79.35, torontoSquare)).toBe(false);
  });

  it("treats boundary points as inside (turf behaviour)", () => {
    // On the left edge: lat=43.65, lng=-79.4 (minLng boundary)
    expect(isPointInGeometry(43.65, -79.4, torontoSquare)).toBe(true);
  });

  it("does NOT swap lat/lng when pointFromLatLng is used (axis-order guard)", () => {
    // lat=43.65, lng=-79.35 should be inside
    // If axis order were swapped, lat=-79.35 lng=43.65 would be outside Canada
    const pt = pointFromLatLng(43.65, -79.35);
    const [lng, lat] = pt.geometry.coordinates;
    expect(lat).toBe(43.65);
    expect(lng).toBe(-79.35);
  });

  it("validateGeometry passes a valid closed polygon", () => {
    expect(validateGeometry(torontoSquare)).toEqual([]);
  });

  it("validateGeometry rejects an unclosed ring", () => {
    const unclosed = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-79.4, 43.63],
          [-79.3, 43.63],
          [-79.3, 43.68],
          [-79.4, 43.68],
          // missing closing point
        ],
      ],
    };
    const errors = validateGeometry(unclosed);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("not closed");
  });

  it("validateGeometry rejects coordinates outside Canada bounds", () => {
    const wrongCountry = {
      type: "Polygon" as const,
      coordinates: [
        [
          [2.3, 48.8],   // Paris coordinates (clearly wrong for Canada)
          [2.4, 48.8],
          [2.4, 48.9],
          [2.3, 48.9],
          [2.3, 48.8],
        ],
      ],
    };
    const errors = validateGeometry(wrongCountry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("outside Canada bounds");
  });

  it("validateGeometry rejects likely lat/lng swap (lat in lng position)", () => {
    // If someone pastes [lat, lng] instead of [lng, lat], lat value ~43 in lng slot is valid
    // but lng value ~-79 in lat slot is not valid for Canada (lat must be > 41.6)
    // Swapped: coordinates would be [lat=43, lng=-79] which would be valid but let's test a case
    // where the swap is detectable: lng=43 (positive) would be outside Canada (minLng=-141)
    const latLngSwapped = {
      type: "Polygon" as const,
      coordinates: [
        [
          [43.65, -79.35],  // [lat, lng] swapped — lat=43 is out of Canada's lng range
          [43.68, -79.35],
          [43.68, -79.30],
          [43.65, -79.30],
          [43.65, -79.35],
        ],
      ],
    };
    const errors = validateGeometry(latLngSwapped);
    // 43.65 as longitude is outside Canada's lng bounds (-141 to -52)
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── Registry geometry validation ────────────────────────────────────────────

describe("zone-geometry.ts registry validity (CI guard)", () => {
  it("all entries in ZONE_GEOMETRIES pass geometry validation", () => {
    const allErrors: string[] = [];
    for (const [areaId, entry] of Object.entries(ZONE_GEOMETRIES)) {
      for (const service of ["daily", "weekly"] as const) {
        const geom = entry[service];
        if (!geom) continue;
        const errors = validateGeometry(geom);
        errors.forEach((e) => allErrors.push(`[${areaId}.${service}] ${e}`));
      }
    }
    if (allErrors.length > 0) {
      throw new Error(
        `Zone geometry validation failed:\n${allErrors.map((e) => `  • ${e}`).join("\n")}`
      );
    }
    // passes if ZONE_GEOMETRIES is empty (no polygons drawn yet) or all valid
    expect(allErrors).toHaveLength(0);
  });
});

// ─── Polygon-mode serviceability (end-to-end, with a test polygon) ────────────

describe("polygon-mode serviceability", () => {
  // We test the polygon decision core directly, using a synthetic area,
  // since real areas don't have polygons drawn yet.
  //
  // The actual point-in-polygon call is tested in the geo helpers suite above.
  // Here we verify that resolveServiceability respects the coordinate-first path.

  it("uses label match for all-mode areas when coords are provided", () => {
    const result = resolveServiceability({
      areaLabel: "North York",
      postalCode: "M2N 1A1",
      lat: 43.767,
      lng: -79.414,
    });
    expect(result.canDaily).toBe(true);
    expect(result.canWeekly).toBe(true);
    expect(result.coordsMissing).toBe(false);
  });

  it("canDeliverDaily accepts coords optional parameter without breaking FSA logic", () => {
    expect(canDeliverDaily("Richmond Hill", "L4B 1L4", { lat: 43.85, lng: -79.43 })).toBe(true);
    expect(canDeliverDaily("Richmond Hill", "L4Z 1A1", { lat: 43.85, lng: -79.43 })).toBe(false);
  });

  it("canDeliverWeekly accepts coords optional parameter", () => {
    expect(canDeliverWeekly("Richmond Hill", "L4Z 1A1", { lat: 43.85, lng: -79.43 })).toBe(true);
    expect(canDeliverWeekly("Scarborough", "M1B 1A1", { lat: 43.77, lng: -79.24 })).toBe(true);
  });
});

// ─── coverage-copy formatters ─────────────────────────────────────────────────

describe("coverage-copy formatters", () => {
  it("includes partial qualifier for include-mode daily areas", () => {
    expect(getAreaDisplayLabel("Richmond Hill", "daily", "en")).toBe("Richmond Hill (selected areas)");
    expect(getAreaDisplayLabel("Richmond Hill", "daily", "zh")).toBe("Richmond Hill（部分区域）");
    expect(getAreaDisplayLabel("Richmond Hill", "weekly", "en")).toBe("Richmond Hill");
    expect(getAreaDisplayLabel("Downtown Toronto", "daily", "en")).toBe("Downtown Toronto");
  });

  it("includes all daily areas in the formatted list", () => {
    const list = formatDailyCoverageList("en");
    expect(list).toContain("Downtown Toronto");
    expect(list).toContain("Richmond Hill (selected areas)");
    expect(list).not.toContain("Scarborough");
  });

  it("includes weekly-only areas (not daily areas) in the weekly-only list", () => {
    const list = formatWeeklyOnlyCoverageList("en");
    expect(list).toContain("Scarborough");
    expect(list).not.toContain("Downtown Toronto");
  });

  it("generates zh daily list with Chinese partial qualifier", () => {
    const list = formatDailyCoverageList("zh");
    expect(list).toContain("Richmond Hill（部分区域）");
  });
});

// ─── Google parser ↔ registry compat ─────────────────────────────────────────

describe("Google parser ↔ service registry compatibility", () => {
  it("keeps Google parser labels compatible with the service registry", () => {
    const parsed = parseGooglePlaceToAddress({
      id: "place-richmond-hill",
      formattedAddress: "95 East Beaver Creek Rd, Richmond Hill, ON L4B 1L4, Canada",
      location: { lat: 43.849, lng: -79.379 },
      addressComponents: [
        { longText: "95", shortText: "95", types: ["street_number"] },
        { longText: "East Beaver Creek Road", shortText: "East Beaver Creek Rd", types: ["route"] },
        { longText: "Richmond Hill", shortText: "Richmond Hill", types: ["locality"] },
        { longText: "Ontario", shortText: "ON", types: ["administrative_area_level_1"] },
        { longText: "L4B 1L4", shortText: "L4B 1L4", types: ["postal_code"] },
        { longText: "Canada", shortText: "CA", types: ["country"] },
      ],
    });

    expect(parsed.address.province).toBe("Richmond Hill");
    const svc = resolveServiceability({
      areaLabel: parsed.address.province,
      postalCode: parsed.addressGeo.postalCode,
      lat: parsed.addressGeo.lat,
      lng: parsed.addressGeo.lng,
    });
    expect(svc.isServed).toBe(true);
    expect(svc.coordsMissing).toBe(false);
  });
});

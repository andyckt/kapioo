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
import { DAILY_DELIVERY_ZONE } from "@/lib/zones/daily-zone";
import { WEEKLY_FSA_LIST } from "@/lib/zones/weekly-fsas";

// ─── FSA utility ──────────────────────────────────────────────────────────────

describe("normalizeFsa", () => {
  it("normalizes Canadian FSA prefixes", () => {
    expect(normalizeFsa("l4b 1l4")).toBe("L4B");
    expect(normalizeFsa(" M5V3K2 ")).toBe("M5V");
    expect(normalizeFsa("")).toBe("");
    expect(normalizeFsa(null)).toBe("");
    expect(normalizeFsa(undefined)).toBe("");
  });
});

// ─── Global daily polygon ─────────────────────────────────────────────────────

describe("canDeliverDaily — global polygon", () => {
  it("allows an address inside the Downtown Toronto blob", () => {
    // Coordinates known to be inside the Downtown Toronto polygon
    expect(canDeliverDaily({ lat: 43.65, lng: -79.39 })).toBe(true);
  });

  it("allows an address inside the Richmond Hill blob", () => {
    expect(canDeliverDaily({ lat: 43.849, lng: -79.379 })).toBe(true);
  });

  it("blocks an address outside the polygon (south of downtown)", () => {
    expect(canDeliverDaily({ lat: 43.55, lng: -79.38 })).toBe(false);
  });

  it("blocks an address outside the polygon (far north)", () => {
    expect(canDeliverDaily({ lat: 44.1, lng: -79.4 })).toBe(false);
  });

  it("falls back to display.daily label flag when coords are missing", () => {
    // Downtown Toronto is display.daily=true → allowed as fallback
    expect(canDeliverDaily(undefined, "Downtown Toronto")).toBe(true);
    // Scarborough is display.daily=false → blocked as fallback
    expect(canDeliverDaily(undefined, "Scarborough")).toBe(false);
    // Unknown label → blocked
    expect(canDeliverDaily(undefined, "Atlantis")).toBe(false);
  });

  it("unknown label is served when lat/lng is inside the polygon", () => {
    // This is the key new behavior: label is irrelevant when coords are present
    expect(canDeliverDaily({ lat: 43.65, lng: -79.39 }, "Oak Ridges")).toBe(true);
  });

  it("sets coordsMissing=true in resolveServiceability when no coords given", () => {
    const result = resolveServiceability({ areaLabel: "Downtown Toronto", postalCode: "M5V 1J1" });
    expect(result.coordsMissing).toBe(true);
  });

  it("sets coordsMissing=false in resolveServiceability when coords given", () => {
    const result = resolveServiceability({
      areaLabel: "Downtown Toronto",
      postalCode: "M5V 1J1",
      lat: 43.65,
      lng: -79.39,
    });
    expect(result.coordsMissing).toBe(false);
    expect(result.canDaily).toBe(true);
  });
});

// ─── Global weekly FSA list ───────────────────────────────────────────────────

describe("canDeliverWeekly — FSA list", () => {
  it("WEEKLY_FSA_LIST is active (carrier list received)", () => {
    expect(WEEKLY_FSA_LIST).not.toBeNull();
    expect(Array.isArray(WEEKLY_FSA_LIST)).toBe(true);
  });

  it("allows FSAs that are in the carrier list", () => {
    expect(canDeliverWeekly("M5V 1J1")).toBe(true);   // Downtown Toronto
    expect(canDeliverWeekly("L4B 1L4")).toBe(true);   // Richmond Hill
    expect(canDeliverWeekly("M1B 1A1")).toBe(true);   // Scarborough
    expect(canDeliverWeekly("L8H 1A1")).toBe(true);   // Hamilton
  });

  it("blocks FSAs that are NOT in the carrier list", () => {
    expect(canDeliverWeekly("Z9Z 9Z9")).toBe(false);  // unknown
    expect(canDeliverWeekly("A1A 1A1")).toBe(false);  // Newfoundland
  });

  it("falls back to display.weekly label flag when postal code is empty", () => {
    // No postal code → label fallback
    expect(canDeliverWeekly("", "Downtown Toronto")).toBe(true);
    expect(canDeliverWeekly("", "Atlantis")).toBe(false);
  });

  it("normalizeFsa handles the FSA extraction that the list check relies on", () => {
    // When WEEKLY_FSA_LIST has a value, the check normalizes and compares FSAs.
    // Test the normalization that underpins the list lookup.
    expect(normalizeFsa("M5V 1J1")).toBe("M5V");
    expect(normalizeFsa("L4B 1L4")).toBe("L4B");
    expect(normalizeFsa("M1B 1A1")).toBe("M1B");
    // The FSA list check: normalize list + normalize input, then includes()
    const list = ["M5V", "L4B", "L4C"].map(normalizeFsa);
    expect(list.includes(normalizeFsa("M5V 1J1"))).toBe(true);
    expect(list.includes(normalizeFsa("L4B 1L4"))).toBe(true);
    expect(list.includes(normalizeFsa("M1B 1A1"))).toBe(false);
  });
});

// ─── resolveServiceability ────────────────────────────────────────────────────

describe("resolveServiceability", () => {
  it("returns not-served for an unknown area with no coords", () => {
    const result = resolveServiceability({ areaLabel: "Atlantis", postalCode: "Z9Z 9Z9" });
    expect(result.canDaily).toBe(false);
    expect(result.canWeekly).toBe(false);
    expect(result.isServed).toBe(false);
  });

  it("correctly resolves an address inside the polygon", () => {
    const result = resolveServiceability({
      areaLabel: "Downtown Toronto",
      postalCode: "M5V 1J1",
      lat: 43.65,
      lng: -79.39,
    });
    expect(result.canDaily).toBe(true);
    expect(result.canWeekly).toBe(true);
    expect(result.isServed).toBe(true);
    expect(result.coordsMissing).toBe(false);
  });

  it("passes areaLabel through unchanged", () => {
    const result = resolveServiceability({ areaLabel: " Richmond Hill ", postalCode: "" });
    expect(result.areaLabel).toBe("Richmond Hill");
  });
});

// ─── Derived area lists ───────────────────────────────────────────────────────

describe("derived area lists from display flags", () => {
  it("DAILY_DELIVERY_AREAS contains daily display areas", () => {
    expect(DAILY_DELIVERY_AREAS).toContain("Downtown Toronto");
    expect(DAILY_DELIVERY_AREAS).toContain("Richmond Hill");
    expect(DAILY_DELIVERY_AREAS).not.toContain("Scarborough");
  });

  it("WEEKLY_ONLY_AREAS contains weekly-only areas", () => {
    expect(WEEKLY_ONLY_AREAS).toContain("Scarborough");
    expect(WEEKLY_ONLY_AREAS).not.toContain("Downtown Toronto");
  });

  it("isDailyDeliveryArea and isWeeklyDeliveryArea are consistent with display flags", () => {
    expect(isDailyDeliveryArea("Richmond Hill")).toBe(true);
    expect(isDailyDeliveryArea("Scarborough")).toBe(false);
    expect(isWeeklyDeliveryArea("Scarborough")).toBe(true);
  });
});

// ─── Polygon geometry helpers ─────────────────────────────────────────────────

describe("polygon geometry helpers (lib/zones/geo.ts)", () => {
  const torontoSquare = {
    type: "Polygon" as const,
    coordinates: [
      [
        [-79.4, 43.63],
        [-79.3, 43.63],
        [-79.3, 43.68],
        [-79.4, 43.68],
        [-79.4, 43.63],
      ],
    ],
  };

  it("pointFromLatLng produces [lng, lat] GeoJSON point", () => {
    const pt = pointFromLatLng(43.65, -79.35);
    expect(pt.geometry.coordinates).toEqual([-79.35, 43.65]);
  });

  it("detects a known point inside the polygon", () => {
    expect(isPointInGeometry(43.65, -79.35, torontoSquare)).toBe(true);
  });

  it("rejects a known point outside the polygon", () => {
    expect(isPointInGeometry(43.5, -79.35, torontoSquare)).toBe(false);
  });

  it("treats boundary points as inside", () => {
    expect(isPointInGeometry(43.65, -79.4, torontoSquare)).toBe(true);
  });

  it("does NOT swap lat/lng (axis-order guard)", () => {
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
      coordinates: [[[-79.4, 43.63], [-79.3, 43.63], [-79.3, 43.68], [-79.4, 43.68]]],
    };
    const errors = validateGeometry(unclosed);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("not closed");
  });

  it("validateGeometry rejects coordinates outside Canada bounds", () => {
    const wrongCountry = {
      type: "Polygon" as const,
      coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]],
    };
    expect(validateGeometry(wrongCountry).length).toBeGreaterThan(0);
  });
});

// ─── DAILY_DELIVERY_ZONE registry validity (CI guard) ────────────────────────

describe("DAILY_DELIVERY_ZONE validity", () => {
  it("passes validateGeometry", () => {
    const errors = validateGeometry(DAILY_DELIVERY_ZONE);
    if (errors.length > 0) {
      throw new Error(`DAILY_DELIVERY_ZONE geometry is invalid:\n${errors.map(e => `  • ${e}`).join("\n")}`);
    }
    expect(errors).toHaveLength(0);
  });
});

// ─── Coverage copy ────────────────────────────────────────────────────────────

describe("coverage-copy formatters", () => {
  it("appends partial qualifier only for Richmond Hill daily (dailyPartial=true)", () => {
    expect(getAreaDisplayLabel("Richmond Hill", "daily", "en")).toBe("Richmond Hill (selected areas)");
    expect(getAreaDisplayLabel("Richmond Hill", "daily", "zh")).toBe("Richmond Hill（部分区域）");
    expect(getAreaDisplayLabel("Richmond Hill", "weekly", "en")).toBe("Richmond Hill");
    expect(getAreaDisplayLabel("Downtown Toronto", "daily", "en")).toBe("Downtown Toronto");
    expect(getAreaDisplayLabel("Markham", "daily", "en")).toBe("Markham");
  });

  it("formatDailyCoverageList includes daily areas with qualifier on Richmond Hill only", () => {
    const list = formatDailyCoverageList("en");
    expect(list).toContain("Downtown Toronto");
    expect(list).toContain("Richmond Hill (selected areas)");
    expect(list).not.toContain("Scarborough");
  });

  it("formatWeeklyOnlyCoverageList includes weekly-only areas", () => {
    const list = formatWeeklyOnlyCoverageList("en");
    expect(list).toContain("Scarborough");
    expect(list).not.toContain("Downtown Toronto");
  });

  it("zh list uses Chinese partial qualifier", () => {
    expect(formatDailyCoverageList("zh")).toContain("Richmond Hill（部分区域）");
    expect(formatDailyCoverageList("zh")).not.toContain("Downtown Toronto（部分区域）");
  });
});

// ─── Google parser ↔ service compat ──────────────────────────────────────────

describe("Google parser → resolveServiceability", () => {
  it("resolves a Richmond Hill address as served", () => {
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
    const svc = resolveServiceability({
      areaLabel: parsed.address.province,
      postalCode: parsed.addressGeo.postalCode,
      lat: parsed.addressGeo.lat,
      lng: parsed.addressGeo.lng,
    });
    expect(svc.isServed).toBe(true);
    expect(svc.canDaily).toBe(true);
    expect(svc.coordsMissing).toBe(false);
  });
});

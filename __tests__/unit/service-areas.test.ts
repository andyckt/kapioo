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

describe("service area postal-zone helpers", () => {
  it("normalizes Canadian FSA prefixes", () => {
    expect(normalizeFsa("l4b 1l4")).toBe("L4B");
    expect(normalizeFsa(" M5V3K2 ")).toBe("M5V");
    expect(normalizeFsa("")).toBe("");
  });

  it("supports weekly-all but daily-partial Richmond Hill coverage", () => {
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
    expect(canDeliverDaily("Richmond Hill")).toBe(true);
    expect(resolveServiceability({ areaLabel: "Richmond Hill" })).toMatchObject({
      canDaily: true,
      canWeekly: true,
      isServed: true,
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
    });
  });
});

describe("coverage-copy formatters", () => {
  it("includes partial qualifier only for include-mode areas", () => {
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

describe("is-verified grandfathering", () => {
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
    expect(resolveServiceability({
      areaLabel: parsed.address.province,
      postalCode: parsed.addressGeo.postalCode,
    }).isServed).toBe(true);
  });
});

/**
 * Service area registry — display/grouping only.
 *
 * Area entries define what shows in marketing copy, order grouping, and admin
 * dropdowns. They do NOT determine eligibility.
 *
 * Eligibility is decided by two global data files:
 *   - Daily:  lib/zones/daily-zone.ts   (point-in-polygon on lat/lng)
 *   - Weekly: lib/zones/weekly-fsas.ts  (FSA prefix whitelist from carrier)
 *
 * To change coverage, edit those files — not this one.
 */

import { isPointInGeometry } from "./geo";
import { DAILY_DELIVERY_ZONE } from "./daily-zone";
import { WEEKLY_FSA_LIST } from "./weekly-fsas";

// ─── Display registry ─────────────────────────────────────────────────────────

export type ServiceArea = {
  id: string;
  label: string;
  display: {
    /** Show in daily delivery marketing lists */
    daily: boolean;
    /** Show in weekly delivery marketing lists */
    weekly: boolean;
    /**
     * Append "(selected areas)" qualifier in copy.
     * Set true when the drawn polygon covers only part of the administrative area
     * (e.g. Richmond Hill — polygon is smaller than the full city boundary).
     */
    dailyPartial: boolean;
  };
};

export const SERVICE_AREAS: readonly ServiceArea[] = [
  {
    id: "downtown-toronto",
    label: "Downtown Toronto",
    display: { daily: true, weekly: true, dailyPartial: false },
  },
  {
    id: "midtown",
    label: "Midtown",
    display: { daily: true, weekly: true, dailyPartial: false },
  },
  {
    id: "north-york",
    label: "North York",
    display: { daily: true, weekly: true, dailyPartial: false },
  },
  {
    id: "markham",
    label: "Markham",
    display: { daily: true, weekly: true, dailyPartial: false },
  },
  {
    id: "richmond-hill",
    label: "Richmond Hill",
    // dailyPartial: true — polygon covers only part of Richmond Hill
    display: { daily: true, weekly: true, dailyPartial: true },
  },
  {
    id: "east-york",
    label: "East York",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "york",
    label: "York",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "etobicoke",
    label: "Etobicoke",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "scarborough",
    label: "Scarborough",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "thornhill",
    label: "Thornhill",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "vaughan",
    label: "Vaughan (including Maple, Concord, King)",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "aurora",
    label: "Aurora",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "newmarket",
    label: "Newmarket",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "brampton",
    label: "Brampton",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "mississauga",
    label: "Mississauga",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "oakville",
    label: "Oakville",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "hamilton",
    label: "Hamilton",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
  {
    id: "burlington",
    label: "Burlington",
    display: { daily: false, weekly: true, dailyPartial: false },
  },
] as const;

// ─── Derived label lists (same exports as before — no downstream breakage) ───

export type ServiceAreaLabel = string;

export const DAILY_DELIVERY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.display.daily)
  .map((area) => area.label) as ServiceAreaLabel[];

export const WEEKLY_DELIVERY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.display.weekly)
  .map((area) => area.label) as ServiceAreaLabel[];

export const WEEKLY_ONLY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.display.weekly && !area.display.daily)
  .map((area) => area.label) as ServiceAreaLabel[];

// ─── Utility ──────────────────────────────────────────────────────────────────

export function normalizeFsa(postalCode: string | null | undefined): string {
  return String(postalCode ?? "")
    .replace(/\s/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function getServiceAreaByLabel(label: string | null | undefined): ServiceArea | null {
  const normalized = String(label ?? "").trim();
  if (!normalized) return null;
  return SERVICE_AREAS.find((area) => area.label === normalized) ?? null;
}

// ─── Serviceability result ────────────────────────────────────────────────────

export type ServiceabilityResult = {
  areaLabel: string;
  fsa: string;
  canDaily: boolean;
  canWeekly: boolean;
  isServed: boolean;
  /**
   * True when coordinates were absent and the daily check fell back to the
   * display-flag label path. The verify gate routes these users to re-capture
   * coordinates via Google autocomplete.
   */
  coordsMissing: boolean;
};

// ─── Core eligibility functions ───────────────────────────────────────────────

/**
 * Check daily delivery eligibility.
 *
 * Uses point-in-polygon against DAILY_DELIVERY_ZONE when coordinates are present.
 * Falls back to display.daily label flag when coordinates are missing (legacy/no-coords).
 */
export function canDeliverDaily(
  coords?: { lat?: number | null; lng?: number | null },
  fallbackAreaLabel?: string | null
): boolean {
  const hasCoords =
    typeof coords?.lat === "number" &&
    Number.isFinite(coords.lat) &&
    typeof coords?.lng === "number" &&
    Number.isFinite(coords.lng);

  if (hasCoords) {
    return isPointInGeometry(coords!.lat as number, coords!.lng as number, DAILY_DELIVERY_ZONE);
  }

  // Fallback: use display flag when coords are missing
  const area = getServiceAreaByLabel(fallbackAreaLabel);
  return area?.display.daily === true;
}

/**
 * Check weekly delivery eligibility.
 *
 * Uses FSA whitelist from WEEKLY_FSA_LIST (carrier data) when available.
 * Falls back to display.weekly label flag when:
 *   - WEEKLY_FSA_LIST is null (carrier list not yet received)
 *   - postalCode is empty (legacy/manual address without postal)
 */
export function canDeliverWeekly(
  postalCode?: string | null,
  fallbackAreaLabel?: string | null
): boolean {
  const fsa = normalizeFsa(postalCode);

  if (WEEKLY_FSA_LIST !== null) {
    if (!fsa) {
      // No postal code — fall back to label when carrier list exists
      const area = getServiceAreaByLabel(fallbackAreaLabel);
      return area?.display.weekly === true;
    }
    const normalizedList = WEEKLY_FSA_LIST.map(normalizeFsa);
    return normalizedList.includes(fsa);
  }

  // Carrier list not yet received — fall back to display.weekly label flag
  const area = getServiceAreaByLabel(fallbackAreaLabel);
  return area?.display.weekly === true;
}

/**
 * Resolve full serviceability for an address.
 * Used by address forms, verification gate, and checkout.
 */
export function resolveServiceability({
  areaLabel,
  postalCode,
  lat,
  lng,
}: {
  areaLabel: string | null | undefined;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
}): ServiceabilityResult {
  const label = String(areaLabel ?? "").trim();
  const fsa = normalizeFsa(postalCode);
  const hasCoords =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng);

  const coords = hasCoords ? { lat: lat as number, lng: lng as number } : undefined;

  return {
    areaLabel: label,
    fsa,
    canDaily: canDeliverDaily(coords, label),
    canWeekly: canDeliverWeekly(postalCode, label),
    isServed: canDeliverDaily(coords, label) || canDeliverWeekly(postalCode, label),
    coordsMissing: !hasCoords,
  };
}

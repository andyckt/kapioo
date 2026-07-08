import { isPointInGeometry } from "./geo";
import { getZoneGeometry } from "./zone-geometry";

// ─── Coverage model ──────────────────────────────────────────────────────────

export type ServiceCoverage =
  | { mode: "all" }
  /**
   * Polygon-based coverage (authoritative).
   * The actual geometry lives in zone-geometry.ts, keyed by the parent ServiceArea.id.
   * Use this mode once you have drawn and validated the zone polygon.
   */
  | { mode: "polygon" }
  /**
   * @deprecated FSA-prefix bridge. Use when a polygon hasn't been drawn yet.
   * Migrate areas to `mode: "polygon"` as you draw each zone.
   */
  | { mode: "include"; fsa: readonly string[] }
  | { mode: "none" };

// ─── Area registry ───────────────────────────────────────────────────────────

export type ServiceArea = {
  id: string;
  label: string;
  daily: ServiceCoverage;
  weekly: ServiceCoverage;
};

// ─── Serviceability result ────────────────────────────────────────────────────

export type ServiceabilityResult = {
  areaLabel: string;
  fsa: string;
  canDaily: boolean;
  canWeekly: boolean;
  isServed: boolean;
  /**
   * True when coordinates were absent and the decision fell back to the
   * legacy label/FSA path. The verify gate (address-verification-gate.tsx)
   * routes these users to re-capture coordinates via Google autocomplete.
   */
  coordsMissing: boolean;
  /**
   * Informational only — first area whose polygon contains the point (daily or
   * weekly). Does NOT overwrite the Google-inferred area label stored on the user
   * or order. Useful for debugging and admin warnings.
   */
  matchedAreaLabel: string | null;
};

// ─── Area definitions ─────────────────────────────────────────────────────────

// Single source of truth for service eligibility.
// To expand or reduce a partial area:
//   - For polygon areas: update the geometry in lib/zones/zone-geometry.ts
//   - For FSA areas: edit the fsa list below (deprecated, migrate to polygon)
export const SERVICE_AREAS: readonly ServiceArea[] = [
  {
    id: "downtown-toronto",
    label: "Downtown Toronto",
    daily: { mode: "all" },
    weekly: { mode: "all" },
  },
  {
    id: "midtown",
    label: "Midtown",
    daily: { mode: "all" },
    weekly: { mode: "all" },
  },
  {
    id: "north-york",
    label: "North York",
    daily: { mode: "all" },
    weekly: { mode: "all" },
  },
  {
    id: "markham",
    label: "Markham",
    daily: { mode: "all" },
    weekly: { mode: "all" },
  },
  {
    id: "richmond-hill",
    label: "Richmond Hill",
    // @deprecated FSA bridge — migrate to mode:"polygon" once the zone is drawn.
    // Run scripts/audit-zone-impact.ts before switching.
    daily: { mode: "include", fsa: ["L4B", "L4C", "L4E", "L4S"] },
    weekly: { mode: "all" },
  },
  {
    id: "east-york",
    label: "East York",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "york",
    label: "York",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "etobicoke",
    label: "Etobicoke",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "scarborough",
    label: "Scarborough",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "thornhill",
    label: "Thornhill",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "vaughan",
    label: "Vaughan (including Maple, Concord, King)",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "aurora",
    label: "Aurora",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "newmarket",
    label: "Newmarket",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "brampton",
    label: "Brampton",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "mississauga",
    label: "Mississauga",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "oakville",
    label: "Oakville",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "hamilton",
    label: "Hamilton",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
  {
    id: "burlington",
    label: "Burlington",
    daily: { mode: "none" },
    weekly: { mode: "all" },
  },
] as const;

// ─── Derived label lists ──────────────────────────────────────────────────────

export type ServiceAreaLabel = string;

export const DAILY_DELIVERY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.daily.mode !== "none")
  .map((area) => area.label) as ServiceAreaLabel[];

export const WEEKLY_DELIVERY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.weekly.mode !== "none")
  .map((area) => area.label) as ServiceAreaLabel[];

export const WEEKLY_ONLY_AREA_LABELS = SERVICE_AREAS
  .filter((area) => area.weekly.mode !== "none" && area.daily.mode === "none")
  .map((area) => area.label) as ServiceAreaLabel[];

// ─── Utility helpers ──────────────────────────────────────────────────────────

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

// ─── Core decision helpers ────────────────────────────────────────────────────

/**
 * Evaluate a single service coverage for a given point.
 *
 * Priority order:
 *   1. "none"    → always blocked
 *   2. "polygon" → point-in-polygon check (authoritative when coords present)
 *   3. "all"     → allowed when the Google-inferred area label matches this area
 *   4. "include" → deprecated FSA bridge (label match + FSA prefix check)
 *
 * When coords are absent (coordsMissing path), polygon areas degrade to the
 * label-match fallback. The verify gate is responsible for enforcing that all
 * active users have coordinates.
 */
function coverageAllowsPoint(
  coverage: ServiceCoverage,
  areaId: string,
  service: "daily" | "weekly",
  areaLabel: string,
  requestedAreaLabel: string,
  fsa: string,
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (coverage.mode === "none") return false;

  const hasCoords =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng);

  if (coverage.mode === "polygon") {
    if (hasCoords) {
      const geometry = getZoneGeometry(areaId, service);
      if (!geometry) {
        // Polygon mode declared but no geometry drawn yet — fail safe (block).
        return false;
      }
      return isPointInGeometry(lat as number, lng as number, geometry);
    }
    // Coords missing: degrade gracefully to label match until the verify
    // gate forces re-capture.
    return areaLabel === requestedAreaLabel;
  }

  if (coverage.mode === "all") {
    return areaLabel === requestedAreaLabel;
  }

  // mode === "include" (deprecated FSA bridge)
  if (!fsa) {
    // Missing FSA from old/manual data — keep label-level fallback.
    return areaLabel === requestedAreaLabel;
  }
  if (areaLabel !== requestedAreaLabel) return false;
  return coverage.fsa.map((prefix) => normalizeFsa(prefix)).includes(fsa);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check daily delivery eligibility for a customer address.
 *
 * Accepts coordinates for polygon-based areas and falls back to the
 * legacy label/FSA path when they are absent.
 */
export function canDeliverDaily(
  areaLabel: string | null | undefined,
  postalCode?: string | null,
  coords?: { lat?: number | null; lng?: number | null }
): boolean {
  const label = String(areaLabel ?? "").trim();
  const area = getServiceAreaByLabel(label);
  if (!area) return false;
  const fsa = normalizeFsa(postalCode);
  return coverageAllowsPoint(
    area.daily,
    area.id,
    "daily",
    area.label,
    label,
    fsa,
    coords?.lat,
    coords?.lng
  );
}

/**
 * Check weekly delivery eligibility for a customer address.
 *
 * Accepts coordinates for polygon-based areas and falls back to the
 * legacy label/FSA path when they are absent.
 */
export function canDeliverWeekly(
  areaLabel: string | null | undefined,
  postalCode?: string | null,
  coords?: { lat?: number | null; lng?: number | null }
): boolean {
  const label = String(areaLabel ?? "").trim();
  const area = getServiceAreaByLabel(label);
  if (!area) return false;
  const fsa = normalizeFsa(postalCode);
  return coverageAllowsPoint(
    area.weekly,
    area.id,
    "weekly",
    area.label,
    label,
    fsa,
    coords?.lat,
    coords?.lng
  );
}

/**
 * Resolve full serviceability for an address.
 *
 * Accepts optional coordinates for polygon-based checks.
 * When coords are absent, falls back to label/FSA logic and sets
 * `coordsMissing: true` to signal the caller (or verify gate) that
 * re-capture via Google autocomplete is needed.
 *
 * `matchedAreaLabel` is informational — the first area whose polygon
 * contains the point. It does NOT overwrite the stored area label on the user
 * or order; the Google-inferred label is preserved for display and admin logic.
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
  const coords = { lat, lng };

  const hasCoords =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng);

  const canDaily = canDeliverDaily(label, postalCode, coords);
  const canWeekly = canDeliverWeekly(label, postalCode, coords);

  // Compute matchedAreaLabel: first area (by registry order) that contains
  // the point in either daily or weekly polygon coverage.
  let matchedAreaLabel: string | null = null;
  if (hasCoords) {
    for (const area of SERVICE_AREAS) {
      const dailyGeom = area.daily.mode === "polygon" ? getZoneGeometry(area.id, "daily") : null;
      const weeklyGeom = area.weekly.mode === "polygon" ? getZoneGeometry(area.id, "weekly") : null;
      if (
        (dailyGeom && isPointInGeometry(lat as number, lng as number, dailyGeom)) ||
        (weeklyGeom && isPointInGeometry(lat as number, lng as number, weeklyGeom))
      ) {
        matchedAreaLabel = area.label;
        break;
      }
    }
  }

  return {
    areaLabel: label,
    fsa,
    canDaily,
    canWeekly,
    isServed: canDaily || canWeekly,
    coordsMissing: !hasCoords,
    matchedAreaLabel,
  };
}

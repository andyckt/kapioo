export type ServiceCoverage =
  | { mode: "all" }
  | { mode: "include"; fsa: readonly string[] }
  | { mode: "none" };

export type ServiceArea = {
  id: string;
  label: string;
  daily: ServiceCoverage;
  weekly: ServiceCoverage;
};

export type ServiceabilityResult = {
  areaLabel: string;
  fsa: string;
  canDaily: boolean;
  canWeekly: boolean;
  isServed: boolean;
};

// Single source of truth for service eligibility.
// To expand or reduce a partial area, edit only its FSA list below.
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
    // Richmond Hill is intentionally FSA-controlled for daily delivery.
    // Remove or add prefixes here as coverage changes.
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

function coverageAllows(coverage: ServiceCoverage, fsa: string): boolean {
  if (coverage.mode === "none") return false;
  if (coverage.mode === "all") return true;

  // Missing FSA means old/manual data. Keep label-level fallback so legacy users
  // are not unexpectedly blocked before they verify a Google address.
  if (!fsa) return true;

  return coverage.fsa.map((prefix) => normalizeFsa(prefix)).includes(fsa);
}

export function canDeliverDaily(
  areaLabel: string | null | undefined,
  postalCode?: string | null
): boolean {
  const area = getServiceAreaByLabel(areaLabel);
  if (!area) return false;
  return coverageAllows(area.daily, normalizeFsa(postalCode));
}

export function canDeliverWeekly(
  areaLabel: string | null | undefined,
  postalCode?: string | null
): boolean {
  const area = getServiceAreaByLabel(areaLabel);
  if (!area) return false;
  return coverageAllows(area.weekly, normalizeFsa(postalCode));
}

export function resolveServiceability({
  areaLabel,
  postalCode,
}: {
  areaLabel: string | null | undefined;
  postalCode?: string | null;
}): ServiceabilityResult {
  const label = String(areaLabel ?? "").trim();
  const fsa = normalizeFsa(postalCode);
  const canDaily = canDeliverDaily(label, postalCode);
  const canWeekly = canDeliverWeekly(label, postalCode);

  return {
    areaLabel: label,
    fsa,
    canDaily,
    canWeekly,
    isServed: canDaily || canWeekly,
  };
}

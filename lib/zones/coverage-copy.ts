/**
 * Human-readable coverage copy, derived entirely from the service-area registry.
 *
 * Single source of truth for all customer-facing area lists — dialogs, FAQ,
 * how-it-works, chips, etc. Import helpers from here; never build area strings
 * by hand elsewhere so registry changes propagate automatically.
 */

import { SERVICE_AREAS, DAILY_DELIVERY_AREA_LABELS, WEEKLY_ONLY_AREA_LABELS } from "./service-areas";

/**
 * Whether an area has partial (polygon-gated or FSA-gated) coverage for a
 * given service. Both "polygon" and "include" modes indicate partial coverage —
 * only part of the geographic area is served.
 */
function isPartialCoverage(areaLabel: string, service: "daily" | "weekly"): boolean {
  const area = SERVICE_AREAS.find((a) => a.label === areaLabel);
  if (!area) return false;
  return area[service].mode === "polygon" || area[service].mode === "include";
}

/**
 * Display label for a single area — appends the partial qualifier when needed.
 * e.g. "Richmond Hill" → "Richmond Hill (selected areas)" or "Richmond Hill（部分区域）"
 */
export function getAreaDisplayLabel(
  areaLabel: string,
  service: "daily" | "weekly",
  lang: "zh" | "en"
): string {
  if (!isPartialCoverage(areaLabel, service)) return areaLabel;
  return lang === "zh"
    ? `${areaLabel}（部分区域）`
    : `${areaLabel} (selected areas)`;
}

/**
 * Comma-joined list of daily delivery areas, with partial qualifier on relevant ones.
 * e.g. "Downtown Toronto, Midtown, North York, Markham, and Richmond Hill (selected areas)"
 */
export function formatDailyCoverageList(lang: "zh" | "en"): string {
  const labels = DAILY_DELIVERY_AREA_LABELS.map((label) =>
    getAreaDisplayLabel(label, "daily", lang)
  );
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1);
  const conjunction = lang === "zh" ? "以及 " : "and ";
  return rest.join("、") + (lang === "zh" ? "，以及 " : ", and ") + last;
}

/**
 * Comma-joined list of weekly-only areas (areas that have weekly but NO daily).
 */
export function formatWeeklyOnlyCoverageList(lang: "zh" | "en"): string {
  const labels = WEEKLY_ONLY_AREA_LABELS;
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1);
  return rest.join(lang === "zh" ? "、" : ", ") + (lang === "zh" ? "、以及 " : ", and ") + last;
}

/**
 * Short explanatory sentence used in dialogs and FAQ.
 * e.g. "Daily Bento service is currently limited to Downtown Toronto, Midtown... and Richmond Hill (selected areas)."
 */
export function formatDailyCoverageSentence(
  productName: string,
  lang: "zh" | "en"
): string {
  const list = formatDailyCoverageList(lang);
  if (lang === "zh") {
    return `${productName}服务目前仅限于 ${list}。请输入详细地址确认。`;
  }
  return `${productName} service is currently limited to ${list}. Enter your exact address to confirm.`;
}

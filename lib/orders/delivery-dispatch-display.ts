type Language = "zh" | "en";

/** Single source of truth for customer/admin ETA window length. */
export const DELIVERY_ETA_WINDOW_MINUTES = 30;

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameCalendarDayInToronto(a: Date, b: Date): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(a) === formatter.format(b);
}

function formatTimeOnly(date: Date, language: Language): string {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: language === "en",
    timeZone: "America/Toronto",
  });
}

/**
 * Core ETA display: a 30-minute arrival window from the received ETA (e.g. 10:00–10:30).
 * Use this everywhere a single time or interval should be shown.
 */
export function formatEtaTimeInterval(eta: string | Date, language: Language): string | null {
  const start = toDate(eta);
  if (!start) {
    return null;
  }

  const end = new Date(start.getTime() + DELIVERY_ETA_WINDOW_MINUTES * 60 * 1000);
  return `${formatTimeOnly(start, language)}–${formatTimeOnly(end, language)}`;
}

/** Customer detail: optional “Today” / date prefix + ETA interval. */
export function formatCustomerEstimatedArrival(
  eta: string | Date,
  language: Language
): string | null {
  const interval = formatEtaTimeInterval(eta, language);
  if (!interval) {
    return null;
  }

  const etaDate = toDate(eta);
  if (!etaDate) {
    return null;
  }

  const now = new Date();

  if (isSameCalendarDayInToronto(etaDate, now)) {
    return language === "zh" ? `今天 ${interval}` : `Today ${interval}`;
  }

  const locale = language === "zh" ? "zh-CN" : "en-US";
  const dateText = etaDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  });

  return language === "zh" ? `${dateText} ${interval}` : `${dateText}, ${interval}`;
}

/** Admin order detail: same interval format, English. */
export function formatAdminEstimatedArrival(eta: string | Date): string | null {
  return formatEtaTimeInterval(eta, "en");
}

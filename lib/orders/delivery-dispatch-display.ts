type Language = "zh" | "en";

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

/** Customer-facing ETA line (no dispatched-at). */
export function formatCustomerEstimatedArrival(
  eta: string | Date,
  language: Language
): string | null {
  const etaDate = toDate(eta);
  if (!etaDate) {
    return null;
  }

  const now = new Date();
  const timeText = formatTimeOnly(etaDate, language);

  if (isSameCalendarDayInToronto(etaDate, now)) {
    return language === "zh" ? `今天 ${timeText}` : `Today ${timeText}`;
  }

  const locale = language === "zh" ? "zh-CN" : "en-US";
  const dateText = etaDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  });

  return language === "zh" ? `${dateText} ${timeText}` : `${dateText}, ${timeText}`;
}

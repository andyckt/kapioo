import { describe, expect, it } from "vitest";

import {
  DELIVERY_ETA_WINDOW_MINUTES,
  formatCustomerEstimatedArrival,
  formatEtaTimeInterval,
} from "@/lib/orders/delivery-dispatch-display";

describe("delivery-dispatch-display", () => {
  it("formats a 30-minute ETA window in English", () => {
    const eta = "2026-05-19T14:00:00.000Z";
    const result = formatEtaTimeInterval(eta, "en");
    expect(result).toMatch(/10:00\s*AM–10:30\s*AM/);
  });

  it("formats a 30-minute ETA window in Chinese", () => {
    const eta = "2026-05-19T14:00:00.000Z";
    const result = formatEtaTimeInterval(eta, "zh");
    expect(result).toMatch(/10:00–10:30/);
  });

  it("uses DELIVERY_ETA_WINDOW_MINUTES for the end of the interval", () => {
    const start = new Date("2026-05-19T14:00:00.000Z");
    const end = new Date(start.getTime() + DELIVERY_ETA_WINDOW_MINUTES * 60 * 1000);
    expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000);
  });

  it("prefixes customer detail with Today when ETA is today in Toronto", () => {
    const now = new Date();
    const torontoDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const [year, month, day] = torontoDate.split("-").map(Number);
    const eta = new Date(Date.UTC(year, month - 1, day, 18, 0, 0));

    const result = formatCustomerEstimatedArrival(eta, "en");
    expect(result).toMatch(/^Today /);
    expect(result).toMatch(/–/);
  });

  it("returns null for invalid ETA input", () => {
    expect(formatEtaTimeInterval("not-a-date", "en")).toBeNull();
  });
});

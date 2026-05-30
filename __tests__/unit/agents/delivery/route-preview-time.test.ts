import { formatDateTime } from "@/lib/format";
import {
  computeTorontoEstimatedFinishIso,
  computeTorontoStopArrivalIsos,
  formatTorontoLocalTimeForRouteOptimizer,
  parseTorontoLocalDateTime,
} from "@/lib/agents/delivery/route-preview-time";

describe("lib/agents/delivery/route-preview-time", () => {
  it("parses delivery date + start time as America/Toronto local time", () => {
    const start = parseTorontoLocalDateTime("2026-05-31", "10:00");

    expect(start.toISOString()).toBe("2026-05-31T14:00:00.000Z");
  });

  it("computes estimated finish from Toronto start + total duration", () => {
    const finishIso = computeTorontoEstimatedFinishIso({
      deliveryDate: "2026-05-31",
      startTime: "10:00",
      totalDurationMinutes: 255.41,
    });

    expect(formatDateTime(finishIso)).toBe("May 31, 2026, 2:15 PM");
  });

  it("computes stop arrival times from travel legs after Toronto start", () => {
    const arrivals = computeTorontoStopArrivalIsos({
      deliveryDate: "2026-05-31",
      startTime: "10:00",
      stops: [
        { durationFromPreviousMinutes: 4.11, serviceTimeMinutes: 5 },
        { durationFromPreviousMinutes: 12.5, serviceTimeMinutes: 5 },
      ],
    });

    expect(formatDateTime(arrivals[0]!)).toBe("May 31, 2026, 10:04 AM");
    expect(formatDateTime(arrivals[1]!)).toBe("May 31, 2026, 10:21 AM");
  });

  it("formats Toronto local HH:MM for Route Optimizer start_time", () => {
    const finishIso = computeTorontoEstimatedFinishIso({
      deliveryDate: "2026-05-31",
      startTime: "10:00",
      totalDurationMinutes: 30,
    });

    expect(formatTorontoLocalTimeForRouteOptimizer(finishIso)).toBe("10:30");
  });
});

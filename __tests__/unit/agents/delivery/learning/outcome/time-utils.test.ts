import { computeLatenessAttribution } from "@/lib/agents/delivery/learning/outcome/compute-lateness-attribution";
import { computeDeadlineBufferMinutes } from "@/lib/agents/delivery/learning/outcome/compute-deadline-buffer";
import { computeRunStartDelayMinutes } from "@/lib/agents/delivery/learning/outcome/compute-start-delay";
import {
  normalizeTimeTo24Hour,
  parseRunStartDateTime,
  subtractMinutesFromIso,
} from "@/lib/agents/delivery/learning/outcome/time-utils";
import { normalizeFinishTimeIfStartedOnTime } from "@/lib/agents/delivery/learning/outcome/normalize-finish-time";

import {
  DELIVERY_DATE,
  torontoIso,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";

describe("learning outcome time utilities", () => {
  it("parses deliveryDate + 10:00 planned start", () => {
    const parsed = parseRunStartDateTime({
      deliveryDate: DELIVERY_DATE,
      startTime: "10:00",
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe(torontoIso(DELIVERY_DATE, "10:00"));
  });

  it("parses 10:00 AM when supported", () => {
    expect(normalizeTimeTo24Hour("10:00 AM")).toBe("10:00");
    const parsed = parseRunStartDateTime({
      deliveryDate: DELIVERY_DATE,
      startTime: "10:00 AM",
    });
    expect(parsed?.toISOString()).toBe(torontoIso(DELIVERY_DATE, "10:00"));
  });

  it("returns null for invalid time", () => {
    expect(
      parseRunStartDateTime({
        deliveryDate: DELIVERY_DATE,
        startTime: "invalid",
      })
    ).toBeNull();
  });

  it("computes startDelayMinutes", () => {
    const delay = computeRunStartDelayMinutes({
      deliveryDate: DELIVERY_DATE,
      plannedStartTime: "10:00",
      actualStartTime: torontoIso(DELIVERY_DATE, "10:30"),
    });

    expect(delay.startDelayMinutes).toBe(30);
  });

  it("does not produce negative delay when actual start is early", () => {
    const delay = computeRunStartDelayMinutes({
      deliveryDate: DELIVERY_DATE,
      plannedStartTime: "10:00",
      actualStartTime: torontoIso(DELIVERY_DATE, "09:50"),
    });

    expect(delay.startDelayMinutes).toBe(0);
  });

  it("computes deadline buffer before and after 1 PM", () => {
    const before = computeDeadlineBufferMinutes({
      deliveryDate: DELIVERY_DATE,
      finishTime: torontoIso(DELIVERY_DATE, "12:30"),
    });
    const after = computeDeadlineBufferMinutes({
      deliveryDate: DELIVERY_DATE,
      finishTime: torontoIso(DELIVERY_DATE, "13:15"),
    });

    expect(before).toBe(30);
    expect(after).toBe(-15);
  });

  it("normalizes finish time by subtracting start delay", () => {
    const actualFinish = torontoIso(DELIVERY_DATE, "13:15");
    const normalized = normalizeFinishTimeIfStartedOnTime({
      actualFinishTime: actualFinish,
      startDelayMinutes: 30,
    });

    expect(normalized).toBe(subtractMinutesFromIso(actualFinish, 30));
  });
});

describe("computeLatenessAttribution", () => {
  it("returns on_time when actual finish is before 1 PM", () => {
    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: torontoIso(DELIVERY_DATE, "12:30"),
      startDelayMinutes: 0,
    });

    expect(result.latenessAttribution).toBe("on_time");
    expect(result.actualLateMinutes).toBe(0);
  });

  it("returns driver_start_delay for late finish with meaningful delay and normalized on-time finish", () => {
    const actualFinish = torontoIso(DELIVERY_DATE, "13:15");
    const normalizedFinish = subtractMinutesFromIso(actualFinish, 30);

    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: actualFinish,
      normalizedFinishTimeIfStartedOnTime: normalizedFinish,
      startDelayMinutes: 30,
    });

    expect(result.latenessAttribution).toBe("driver_start_delay");
    expect(result.routeWouldHaveMetDeadlineIfStartedOnTime).toBe(true);
  });

  it("returns route_problem when late without meaningful delay", () => {
    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: torontoIso(DELIVERY_DATE, "13:15"),
      normalizedFinishTimeIfStartedOnTime: torontoIso(DELIVERY_DATE, "13:15"),
      startDelayMinutes: 5,
    });

    expect(result.latenessAttribution).toBe("route_problem");
  });

  it("returns mixed when normalized finish is still late with meaningful delay", () => {
    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: torontoIso(DELIVERY_DATE, "13:45"),
      normalizedFinishTimeIfStartedOnTime: torontoIso(DELIVERY_DATE, "13:20"),
      startDelayMinutes: 25,
    });

    expect(result.latenessAttribution).toBe("mixed");
  });

  it("returns unknown when actual finish is missing", () => {
    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: null,
      startDelayMinutes: 30,
    });

    expect(result.latenessAttribution).toBe("unknown");
  });

  it("treats exact 1 PM deadline as on_time with zero late minutes", () => {
    const result = computeLatenessAttribution({
      deliveryDate: DELIVERY_DATE,
      actualFinishTime: torontoIso(DELIVERY_DATE, "13:00"),
      startDelayMinutes: 0,
    });

    expect(result.latenessAttribution).toBe("on_time");
    expect(result.actualLateMinutes).toBe(0);
  });
});

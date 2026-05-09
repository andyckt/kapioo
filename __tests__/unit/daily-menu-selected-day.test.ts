import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  pickDefaultAvailableDay,
  resolveDailyMenuSelectedDayAfterFetch,
} from "@/lib/daily-menu-selected-day"
import type { DayData } from "@/lib/daily-delivery"

const cutoff: { hour: number; minute: number } = { hour: 11, minute: 59 }

function day(partial: Partial<DayData> & Pick<DayData, "date" | "displayName" | "week">): DayData {
  return {
    combos: [],
    ...partial,
  }
}

describe("daily-menu-selected-day", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // May 10, 2026 noon Toronto-agnostic local Date for stable ordering tests
    vi.setSystemTime(new Date(2026, 4, 10, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("pickDefaultAvailableDay chooses earliest future available day", () => {
    const formattedDays: Record<string, DayData> = {
      "tuesday-w1": day({ date: "Aug 12", displayName: "tuesday", week: 1 }),
      "monday-w1": day({ date: "Aug 11", displayName: "monday", week: 1 }),
    }
    expect(pickDefaultAvailableDay(formattedDays, cutoff)).toBe("monday-w1")
  })

  it("resolveDailyMenuSelectedDayAfterFetch keeps previous when still valid", () => {
    const formattedDays: Record<string, DayData> = {
      "monday-w1": day({ date: "Aug 11", displayName: "monday", week: 1 }),
      "tuesday-w1": day({ date: "Aug 12", displayName: "tuesday", week: 1 }),
    }
    expect(
      resolveDailyMenuSelectedDayAfterFetch("tuesday-w1", formattedDays, cutoff, "en")
    ).toBe("tuesday-w1")
  })

  it("resolveDailyMenuSelectedDayAfterFetch falls back when previous id missing", () => {
    const formattedDays: Record<string, DayData> = {
      "monday-w1": day({ date: "Aug 11", displayName: "monday", week: 1 }),
      "tuesday-w1": day({ date: "Aug 12", displayName: "tuesday", week: 1 }),
    }
    expect(
      resolveDailyMenuSelectedDayAfterFetch("saturday-w1", formattedDays, cutoff, "en")
    ).toBe("monday-w1")
  })

  it("resolveDailyMenuSelectedDayAfterFetch returns previous when snapshot empty", () => {
    expect(resolveDailyMenuSelectedDayAfterFetch("tuesday-w1", {}, cutoff, "en")).toBe("tuesday-w1")
  })
})

import {
  menuDateStringToIso,
  orderHasNextWeekMenuPlacement,
} from "@/lib/next-week-menu-email/next-week-order-users";

describe("menuDateStringToIso", () => {
  const now = new Date("2026-08-03T16:00:00.000Z");

  it("normalizes menu date strings to ISO", () => {
    expect(menuDateStringToIso("Aug 10", now)).toBe("2026-08-10");
    expect(menuDateStringToIso("2026-08-11", now)).toBe("2026-08-11");
  });
});

describe("orderHasNextWeekMenuPlacement", () => {
  const now = new Date("2026-08-03T16:00:00.000Z");
  const nextWeekDates = new Set(["2026-08-10", "2026-08-11"]);

  it("returns true for pending or confirmed orders on next-week menu dates", () => {
    expect(
      orderHasNextWeekMenuPlacement(
        {
          status: "pending",
          createdAt: "2026-08-01T12:00:00.000Z",
          items: [{ date: "Aug 10" }],
        },
        nextWeekDates,
        now
      )
    ).toBe(true);

    expect(
      orderHasNextWeekMenuPlacement(
        {
          status: "confirmed",
          createdAt: "2026-08-01T12:00:00.000Z",
          items: [{ date: "Aug 11" }],
        },
        nextWeekDates,
        now
      )
    ).toBe(true);
  });

  it("returns false for delivery status or non-next-week dates", () => {
    expect(
      orderHasNextWeekMenuPlacement(
        {
          status: "delivery",
          createdAt: "2026-08-01T12:00:00.000Z",
          items: [{ date: "Aug 10" }],
        },
        nextWeekDates,
        now
      )
    ).toBe(false);

    expect(
      orderHasNextWeekMenuPlacement(
        {
          status: "confirmed",
          createdAt: "2026-08-01T12:00:00.000Z",
          items: [{ date: "Aug 4" }],
        },
        nextWeekDates,
        now
      )
    ).toBe(false);
  });

  it("returns false for cancelled orders even on next-week dates", () => {
    expect(
      orderHasNextWeekMenuPlacement(
        {
          status: "cancelled",
          createdAt: "2026-08-01T12:00:00.000Z",
          items: [{ date: "Aug 10" }],
        },
        nextWeekDates,
        now
      )
    ).toBe(false);
  });
});

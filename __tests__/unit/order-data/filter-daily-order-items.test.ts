import { filterDailyOrderItems } from "@/lib/order-data/filter-daily-order-items";

describe("lib/order-data/filter-daily-order-items", () => {
  const createdAt = "2026-05-01T12:00:00.000Z";
  const now = new Date("2026-05-10T12:00:00.000Z");

  it("matches both zero-padded and non-padded stored date strings", () => {
    const items = [
      { day: "monday-w1", date: "Jun 9", comboId: "c1", comboName: "Combo 1", type: "A", quantity: 1, voucherType: "twoDish" },
      { day: "tuesday-w1", date: "Jun 09", comboId: "c2", comboName: "Combo 2", type: "B", quantity: 2, voucherType: "threeDish" },
      { day: "wednesday-w1", date: "Jun 10", comboId: "c3", comboName: "Combo 3", type: "A", quantity: 1, voucherType: "twoDish" },
    ];

    const filtered = filterDailyOrderItems({
      items,
      deliveryDate: "2026-06-09",
      orderCreatedAt: createdAt,
      now,
      sliceItemsToDeliveryDate: true,
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map((item) => item.comboName)).toEqual(["Combo 1", "Combo 2"]);
    expect(filtered.every((item) => item.dateIso === "2026-06-09")).toBe(true);
  });

  it("filters across an inclusive delivery date range", () => {
    const items = [
      { day: "monday-w1", date: "Jun 9", comboId: "c1", comboName: "Combo 1", type: "A", quantity: 1, voucherType: "twoDish" },
      { day: "tuesday-w1", date: "Jun 10", comboId: "c2", comboName: "Combo 2", type: "B", quantity: 1, voucherType: "threeDish" },
      { day: "wednesday-w1", date: "Jun 11", comboId: "c3", comboName: "Combo 3", type: "A", quantity: 1, voucherType: "twoDish" },
    ];

    const filtered = filterDailyOrderItems({
      items,
      deliveryDate: "2026-06-09",
      deliveryDateEnd: "2026-06-10",
      orderCreatedAt: createdAt,
      now,
      sliceItemsToDeliveryDate: true,
    });

    expect(filtered.map((item) => item.comboName)).toEqual(["Combo 1", "Combo 2"]);
  });

  it("returns all items when slicing is disabled", () => {
    const items = [
      { day: "monday-w1", date: "Jun 9", comboId: "c1", comboName: "Combo 1", type: "A", quantity: 1, voucherType: "twoDish" },
      { day: "tuesday-w1", date: "Jun 10", comboId: "c2", comboName: "Combo 2", type: "B", quantity: 1, voucherType: "threeDish" },
    ];

    const filtered = filterDailyOrderItems({
      items,
      deliveryDate: "2026-06-09",
      orderCreatedAt: createdAt,
      now,
      sliceItemsToDeliveryDate: false,
    });

    expect(filtered).toHaveLength(2);
  });
});

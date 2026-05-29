import { summarizeDailyOrderItems } from "@/lib/order-data/summarize-daily-order-items";
import type { DailyOrderBaseItem } from "@/lib/order-data/types";

describe("lib/order-data/summarize-daily-order-items", () => {
  const items: DailyOrderBaseItem[] = [
    {
      day: "monday-w1",
      date: "Jun 9",
      dateIso: "2026-06-09",
      comboId: "c1",
      comboName: "Combo 1",
      type: "A",
      quantity: 2,
      voucherType: "twoDish",
      dishes: ["Dish A"],
    },
    {
      day: "monday-w1",
      date: "Jun 9",
      dateIso: "2026-06-09",
      comboId: "c2",
      comboName: "Combo 2",
      type: "B",
      quantity: 1,
      voucherType: "threeDish",
      dishes: ["Dish B", "Dish C"],
    },
  ];

  it("summarizes quantities, voucher counts, and summary text", () => {
    const summary = summarizeDailyOrderItems(items, { twoDish: 2, threeDish: 1 });

    expect(summary.totalQuantity).toBe(3);
    expect(summary.twoDishVouchers).toBe(2);
    expect(summary.threeDishVouchers).toBe(1);
    expect(summary.lines).toHaveLength(2);
    expect(summary.summaryText).toBe("Combo 1 (2 dishes) x2, Combo 2 (3 dishes) x1");
  });

  it("derives voucher counts from items when stored voucherCost is empty", () => {
    const summary = summarizeDailyOrderItems(items, { twoDish: 0, threeDish: 0 });

    expect(summary.twoDishVouchers).toBe(2);
    expect(summary.threeDishVouchers).toBe(1);
  });
});

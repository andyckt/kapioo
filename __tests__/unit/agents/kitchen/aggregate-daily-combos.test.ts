import type { DailyOrderBase } from "@/lib/order-data/types";

import { aggregateDailyCombos } from "@/lib/agents/kitchen/aggregate-daily-combos";

function buildDailyOrder(
  orderId: string,
  lines: Array<{
    comboName: string;
    type: string;
    voucherType: string;
    quantity: number;
    dishes: string[];
  }>
): DailyOrderBase {
  return {
    mongoId: "mongo-id",
    orderId,
    userId: "user-id",
    status: "confirmed",
    createdAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
    customer: {
      name: "Test",
      email: "test@example.com",
      phone: "4165550100",
      area: "Downtown Toronto",
      specialInstructions: "",
      hasAdminOverride: false,
    },
    deliveryAddress: {
      unitNumber: "",
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V1A1",
      country: "Canada",
      buzzCode: "",
      formatted: "123 Main St, Downtown Toronto",
    },
    delivery: {
      dateIso: "2026-05-31",
      dateDisplay: "May 31",
      dayLabel: "Sunday",
      windowLabel: "Daily window",
      isDailyDeliveryArea: true,
    },
    items: [],
    mealSummary: {
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      twoDishVouchers: lines
        .filter((line) => line.type === "A")
        .reduce((sum, line) => sum + line.quantity, 0),
      threeDishVouchers: lines
        .filter((line) => line.type === "B")
        .reduce((sum, line) => sum + line.quantity, 0),
      lines: lines.map((line) => ({
        comboName: line.comboName,
        type: line.type,
        typeLabel: line.type === "A" ? "2 dishes" : "3 dishes",
        quantity: line.quantity,
        voucherType: line.voucherType,
        dishes: line.dishes,
      })),
      summaryText: "",
    },
    raw: {
      deliveryAddress: {},
      area: "Downtown Toronto",
      phoneNumber: "4165550100",
      specialInstructions: null,
      voucherCost: { twoDish: 0, threeDish: 0 },
    },
    validation: { valid: true, errors: [], warnings: [] },
  };
}

describe("aggregateDailyCombos", () => {
  it("computes common and extra dish servings for mixed 2-dish and 3-dish combo totals", () => {
    const orders = [
      buildDailyOrder("DD-10000001", [
        {
          comboName: "套1",
          type: "A",
          voucherType: "twoDish",
          quantity: 10,
          dishes: ["板栗炖鸡", "时蔬"],
        },
        {
          comboName: "套1",
          type: "B",
          voucherType: "threeDish",
          quantity: 6,
          dishes: ["冬瓜丸子汤", "板栗炖鸡", "时蔬"],
        },
      ]),
    ];

    const { combos, warnings } = aggregateDailyCombos(orders);
    expect(warnings).toEqual([]);
    expect(combos).toHaveLength(1);

    const combo = combos[0];
    expect(combo.combo_name).toBe("套1");

    const extraDish = combo.dishes.find((dish) => dish.dish_name === "冬瓜丸子汤");
    const commonDishA = combo.dishes.find((dish) => dish.dish_name === "板栗炖鸡");
    const commonDishB = combo.dishes.find((dish) => dish.dish_name === "时蔬");

    expect(extraDish).toEqual({
      dish_name: "冬瓜丸子汤",
      servings: 6,
      dish_role: "extra",
    });
    expect(commonDishA).toEqual({
      dish_name: "板栗炖鸡",
      servings: 16,
      dish_role: "common",
    });
    expect(commonDishB).toEqual({
      dish_name: "时蔬",
      servings: 16,
      dish_role: "common",
    });
  });

  it("warns when a combo has only 3-dish orders", () => {
    const orders = [
      buildDailyOrder("DD-10000002", [
        {
          comboName: "套2",
          type: "B",
          voucherType: "threeDish",
          quantity: 4,
          dishes: ["A", "B", "C"],
        },
      ]),
    ];

    const { warnings } = aggregateDailyCombos(orders);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("only 3-dish orders");
  });

  it("marks dishes from 2-dish lines as common even when also in 3-dish lines", () => {
    const orders = [
      buildDailyOrder("DD-10000003", [
        {
          comboName: "套3",
          type: "A",
          voucherType: "twoDish",
          quantity: 2,
          dishes: ["主菜"],
        },
        {
          comboName: "套3",
          type: "B",
          voucherType: "threeDish",
          quantity: 3,
          dishes: ["主菜", "配菜", "汤"],
        },
      ]),
    ];

    const { combos } = aggregateDailyCombos(orders);
    const mainDish = combos[0].dishes.find((dish) => dish.dish_name === "主菜");
    const soup = combos[0].dishes.find((dish) => dish.dish_name === "汤");

    expect(mainDish?.dish_role).toBe("common");
    expect(mainDish?.servings).toBe(5);
    expect(soup?.dish_role).toBe("extra");
    expect(soup?.servings).toBe(3);
  });
});

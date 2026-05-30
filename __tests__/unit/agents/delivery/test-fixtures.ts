import type { DailyOrderBase } from "@/lib/order-data/types";

export function createRoutingTestOrder(
  overrides: Partial<DailyOrderBase> = {}
): DailyOrderBase {
  return {
    mongoId: "507f1f77bcf86cd799439011",
    orderId: "DD-90000001",
    userId: "507f1f77bcf86cd799439022",
    status: "confirmed",
    createdAt: "2026-05-01T12:00:00.000Z",
    updatedAt: "2026-05-01T12:00:00.000Z",
    customer: {
      name: "Alice Customer",
      email: "alice@example.com",
      phone: "416-555-0100",
      area: "Downtown Toronto",
      specialInstructions: "Leave at door",
      hasAdminOverride: false,
    },
    deliveryAddress: {
      unitNumber: "1001",
      streetAddress: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 1A1",
      country: "Canada",
      buzzCode: "1234",
      formatted: "Unit 1001, 123 Main St, Downtown Toronto M5V 1A1, Canada (Buzz code: 1234)",
    },
    delivery: {
      dateIso: "2026-06-09",
      dateDisplay: "Jun 9",
      dayLabel: "Monday",
      windowLabel: "11am – 1pm",
      isDailyDeliveryArea: true,
    },
    items: [
      {
        day: "monday-w1",
        date: "Jun 9",
        dateIso: "2026-06-09",
        comboId: "combo-1",
        comboName: "Combo 1",
        type: "A",
        quantity: 2,
        voucherType: "twoDish",
        dishes: ["Dish A"],
      },
    ],
    mealSummary: {
      totalQuantity: 2,
      twoDishVouchers: 2,
      threeDishVouchers: 0,
      lines: [],
      summaryText: "Combo 1 (2 dishes) x2",
    },
    raw: {
      deliveryAddress: {},
      area: "Downtown Toronto",
      phoneNumber: "416-555-0100",
      specialInstructions: "Leave at door",
      voucherCost: { twoDish: 2, threeDish: 0 },
    },
    validation: {
      valid: true,
      errors: [],
      warnings: [],
    },
    ...overrides,
  };
}

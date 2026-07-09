import { validateDailyOrderBase } from "@/lib/order-data/validate-daily-order-base";
import type { DailyOrderBaseItem, DailyOrderLeanDocument } from "@/lib/order-data/types";

describe("lib/order-data/validate-daily-order-base", () => {
  const baseItem: DailyOrderBaseItem = {
    day: "monday-w1",
    date: "Jun 9",
    dateIso: "2026-06-09",
    comboId: "c1",
    comboName: "Combo 1",
    type: "A",
    quantity: 1,
    voucherType: "twoDish",
    dishes: [],
  };

  const orderDoc = {
    _id: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439022",
    orderId: "DD-10000001",
    items: [baseItem],
  } as unknown as DailyOrderLeanDocument;

  function validate(overrides: Partial<Parameters<typeof validateDailyOrderBase>[0]> = {}) {
    return validateDailyOrderBase({
      orderId: "DD-10000001",
      items: [baseItem],
      customer: {
        name: "Jane Doe",
        phone: "416-555-0100",
        area: "Downtown Toronto",
      },
      deliveryAddress: {
        streetAddress: "123 Main St",
        unitNumber: "1001",
        postalCode: "M5V 1A1",
        buzzCode: "1234",
      },
      deliveryDateIso: "2026-06-09",
      sliceItemsToDeliveryDate: true,
      orderDoc,
      ...overrides,
    });
  }

  it("returns valid for a complete order", () => {
    const result = validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports base errors for missing required fields", () => {
    const result = validate({
      orderId: "",
      items: [],
      customer: { name: "", phone: "", area: "" },
      deliveryAddress: {
        streetAddress: "",
        unitNumber: "",
        postalCode: "",
        buzzCode: "",
      },
      deliveryDateIso: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_ORDER_ID",
        "NO_ITEMS",
        "MISSING_STREET_ADDRESS",
        "MISSING_PHONE",
        "MISSING_AREA",
      ])
    );
  });

  it("reports base warnings for optional and legacy fields", () => {
    const result = validate({
      customer: {
        name: "",
        phone: "416-555-0100",
        area: "Scarborough",
      },
      deliveryAddress: {
        streetAddress: "123 Main St",
        unitNumber: "",
        postalCode: "",
        buzzCode: "",
      },
      orderDoc: {
        ...orderDoc,
        orderCustomerOverride: {
          phoneNumber: "416-555-9999",
        },
      },
    });

    expect(result.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_POSTAL_CODE",
        "MISSING_UNIT",
        "MISSING_CUSTOMER_NAME",
        "MISSING_BUZZ_CODE",
        "HAS_ADMIN_OVERRIDE",
      ])
    );
    expect(result.warnings.map((issue) => issue.code)).not.toContain("NON_DAILY_DELIVERY_AREA");
  });

  it("warns when a daily order address is outside the daily polygon", () => {
    const result = validate({
      customer: {
        name: "Jane Doe",
        phone: "416-555-0100",
        area: "Richmond Hill",
      },
      deliveryAddress: {
        streetAddress: "123 Main St",
        unitNumber: "1001",
        postalCode: "L4Z 1A1",
        buzzCode: "1234",
      },
      addressGeoCoords: { lat: 43.55, lng: -79.38 }, // south of downtown — outside daily polygon
    });

    expect(result.warnings.map((issue) => issue.code)).toContain("NON_DAILY_DELIVERY_AREA");
  });
});

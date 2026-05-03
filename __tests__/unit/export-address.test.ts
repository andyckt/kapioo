import { formatExportDeliveryAddress } from "@/lib/orders/export-address";

describe("formatExportDeliveryAddress", () => {
  it("uses effective area instead of stale address city/province", () => {
    const address = formatExportDeliveryAddress(
      {
        unitNumber: "M2/ M Square Cake",
        streetAddress: "652 Yonge St, Toronto",
        city: "Richmond Hill",
        province: "Richmond Hill",
        postalCode: "M4Y 2A6",
        country: "Canada",
      },
      "Downtown Toronto"
    );

    expect(address).toBe(
      "Unit M2/ M Square Cake, 652 Yonge St, Toronto, Downtown Toronto M4Y 2A6, Canada"
    );
    expect(address).not.toContain("Richmond Hill");
  });

  it("falls back to legacy city/province when no effective area exists", () => {
    expect(
      formatExportDeliveryAddress({
        streetAddress: "95 East Beaver Creek Rd Unit 6",
        city: "Richmond Hill",
        postalCode: "L4B 1L4",
        country: "Canada",
      })
    ).toBe("95 East Beaver Creek Rd Unit 6, Richmond Hill L4B 1L4, Canada");
  });

  it("includes buzz code when present", () => {
    expect(
      formatExportDeliveryAddress(
        {
          streetAddress: "1 Main St",
          postalCode: "A1A 1A1",
          country: "Canada",
          buzzCode: "1234",
        },
        "Downtown Toronto"
      )
    ).toBe("1 Main St, Downtown Toronto A1A 1A1, Canada (Buzz code: 1234)");
  });
});

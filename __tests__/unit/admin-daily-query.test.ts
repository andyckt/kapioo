const { userFindMock } = vi.hoisted(() => ({
  userFindMock: vi.fn(),
}))

vi.mock("@/models/User", () => ({
  default: {
    find: userFindMock,
  },
}))

import { buildAdminDailyOrdersMongoQuery } from "@/lib/orders/admin-daily-query"

describe("lib/orders/admin-daily-query", () => {
  beforeEach(() => {
    userFindMock.mockReset()
    userFindMock.mockReturnValue({
      select: () => ({
        lean: async () => [],
      }),
    })
  })

  it("builds flexible single-date filters using stored daily-order date formats", async () => {
    const query = await buildAdminDailyOrdersMongoQuery({
      page: 1,
      limit: 10,
      deliveryDate: "04 01",
    })

    expect(query).toMatchObject({
      items: {
        $elemMatch: {
          date: { $in: ["Apr 01", "Apr 1"] },
        },
      },
    })
  })

  it("includes the canonical admin search clauses and matched user ids", async () => {
    userFindMock.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: "507f1f77bcf86cd799439011" }],
      }),
    })

    const query = await buildAdminDailyOrdersMongoQuery({
      page: 1,
      limit: 10,
      search: "507f1f77bcf86cd799439011",
    })

    expect(query.$or).toEqual(
      expect.arrayContaining([
        { orderId: /507f1f77bcf86cd799439011/i },
        { "items.comboName": /507f1f77bcf86cd799439011/i },
        { "items.dishes.name": /507f1f77bcf86cd799439011/i },
        { "items.type": /507f1f77bcf86cd799439011/i },
        { userId: { $in: ["507f1f77bcf86cd799439011"] } },
        { userId: "507f1f77bcf86cd799439011" },
      ])
    )
  })
})

const { userFindMock } = vi.hoisted(() => ({
  userFindMock: vi.fn(),
}))

vi.mock("@/models/User", () => ({
  default: {
    find: userFindMock,
  },
}))

import {
  buildAdminDailyOrdersMongoQuery,
  buildSingleDateFormats,
  normalizeDailyOrderDateForCompare,
  pickDayCandidateForExport,
} from "@/lib/orders/admin-daily-query"

describe("lib/orders/admin-daily-query", () => {
  beforeEach(() => {
    userFindMock.mockReset()
    userFindMock.mockReturnValue({
      select: () => ({
        lean: async () => [],
      }),
    })
  })

  it("buildSingleDateFormats expands stored daily-order date keys", () => {
    expect(buildSingleDateFormats("Jun 9")).toEqual(["Jun 09", "Jun 9"])
    expect(buildSingleDateFormats("Apr 14, 2026")).toEqual(["Apr 14"])
  })

  it("pickDayCandidateForExport prefers the dayId present on exported items", () => {
    const candidates = [
      { dayId: "week1-mon", isActive: true },
      { dayId: "week2-mon", isActive: true },
    ]
    const picked = pickDayCandidateForExport(candidates, new Set(["week2-mon"]))
    expect(picked?.dayId).toBe("week2-mon")
  })

  it("pickDayCandidateForExport falls back to an active row when no item dayId matches", () => {
    const candidates = [
      { dayId: "week1-mon", isActive: false },
      { dayId: "week2-mon", isActive: true },
    ]
    const picked = pickDayCandidateForExport(candidates, new Set())
    expect(picked?.dayId).toBe("week2-mon")
  })

  it("normalizeDailyOrderDateForCompare aligns slash dates with menu-style month tokens", () => {
    expect(normalizeDailyOrderDateForCompare("Apr 5, 2026")).toBe("2026-04-05")
    expect(normalizeDailyOrderDateForCompare("4/5/2026")).toBe("2026-04-05")
    expect(normalizeDailyOrderDateForCompare("2026-04-05")).toBe("2026-04-05")
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

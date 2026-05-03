import DailyDeliveryOrder from "@/models/DailyDeliveryOrder"
import WeeklyOrder from "@/models/WeeklyOrder"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestUser } from "../helpers/factories"
import { buildRequest } from "../helpers/request"

const { requireSelfOrAdminMock, connectToDatabaseMock } = vi.hoisted(() => ({
  requireSelfOrAdminMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireSelfOrAdmin: requireSelfOrAdminMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

import { GET } from "@/app/api/users/[id]/orders/count/route"

function formatStoredOrderDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  })
}

function createActor(user: Record<string, unknown>) {
  return {
    user: user as never,
    role: "user",
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

describe("app/api/users/[id]/orders/count", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    requireSelfOrAdminMock.mockReset()
    connectToDatabaseMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("counts upcoming orders by active status and future delivery item date", async () => {
    const user = await createTestUser()
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    await DailyDeliveryOrder.create([
      {
        userId: user._id,
        orderId: "DD-COUNT-PAST",
        status: "pending",
        items: [{ day: "Friday", date: formatStoredOrderDate(yesterday), quantity: 1 }],
        voucherCost: { twoDish: 1, threeDish: 0 },
      },
      {
        userId: user._id,
        orderId: "DD-COUNT-CANCELLED",
        status: "cancelled",
        items: [{ day: "Sunday", date: formatStoredOrderDate(tomorrow), quantity: 1 }],
        voucherCost: { twoDish: 1, threeDish: 0 },
      },
    ])

    await WeeklyOrder.create([
      {
        userId: user._id,
        orderId: "WS-COUNT-FUTURE",
        status: "confirmed",
        items: [
          {
            dayId: "sunday",
            optionId: "option-1",
            optionName: "Meal",
            quantity: 1,
            date: formatStoredOrderDate(tomorrow),
          },
        ],
        creditCost: 1,
        deliveryAddress: { streetAddress: "1 Test St", province: "ON", postalCode: "M1M1M1" },
        phoneNumber: "4165551111",
        area: "Downtown",
      },
      {
        userId: user._id,
        orderId: "WS-COUNT-DELIVERED",
        status: "delivered",
        items: [
          {
            dayId: "sunday",
            optionId: "option-2",
            optionName: "Meal",
            quantity: 1,
            date: formatStoredOrderDate(tomorrow),
          },
        ],
        creditCost: 1,
        deliveryAddress: { streetAddress: "2 Test St", province: "ON", postalCode: "M2M2M2" },
        phoneNumber: "4165552222",
        area: "Downtown",
      },
    ])

    requireSelfOrAdminMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const response = await GET(buildRequest(`http://localhost:3000/api/users/${user._id}/orders/count`), {
      params: Promise.resolve({ id: String(user._id) }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      totalOrders: 4,
      upcomingDeliveries: 1,
    })
  })
})

import Transaction from "@/models/Transaction"
import User from "@/models/User"
import WeeklyOrder from "@/models/WeeklyOrder"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"
import { buildRequest } from "../helpers/request"

const { requireAdminMfaMock, connectToDatabaseMock } = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

import { DELETE } from "@/app/api/admin/weekly-subscription/orders/[id]/route"

function createActor(user: Record<string, unknown>, role: "user" | "admin" = "admin") {
  return {
    user: user as never,
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

async function createWeeklyOrderForUser(userId: unknown, overrides: Record<string, unknown> = {}) {
  return WeeklyOrder.create({
    userId,
    orderId: "WW-12345678",
    items: [
      {
        dayId: "sunday",
        optionId: "option-1",
        optionName: "Korean Chicken",
        quantity: 2,
        date: "April 20",
      },
    ],
    status: "pending",
    creditCost: 2,
    mealPlanType: "6aweek",
    voucherDeducted: true,
    phoneNumber: "4165551234",
    area: "North York",
    deliveryAddress: {
      streetAddress: "123 Weekly Ave",
      province: "ON",
      postalCode: "M1M1M1",
      country: "Canada",
    },
    ...overrides,
  })
}

describe("admin weekly order mutation routes", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    requireAdminMfaMock.mockReset()
    connectToDatabaseMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("deletes a weekly order and restores the weekly voucher with a refund transaction", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ weeklySIXmeals: 0 })
    user.set("planBalances", { "weekly-6x1": 0 })
    await user.save()
    const order = await createWeeklyOrderForUser(user._id)

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await DELETE(
      buildRequest(
        `http://localhost:3000/api/admin/weekly-subscription/orders/${order.orderId}?returnCredits=true`,
        { method: "DELETE" }
      ),
      { params: Promise.resolve({ id: order.orderId }) }
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.meta.refundTarget).toEqual({
      kind: "weekly-plan",
      amount: 1,
      planId: "weekly-6x1",
    })
    expect(await WeeklyOrder.findOne({ orderId: order.orderId }).lean()).toBeNull()
    expect(await User.findById(user._id).lean()).toMatchObject({
      weeklySIXmeals: 1,
      planBalances: {
        "weekly-6x1": 1,
      },
    })
    expect(await Transaction.find().lean()).toMatchObject([
      expect.objectContaining({
        userId: user._id,
        type: "refund",
        amount: 1,
        description: `Refunded weekly order ${order.orderId}`,
      }),
    ])
  })
})

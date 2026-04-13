import DailyDeliveryOrder from "@/models/DailyDeliveryOrder"
import Transaction from "@/models/Transaction"
import User from "@/models/User"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"
import { buildJsonRequest, buildRequest } from "../helpers/request"

const {
  requireAdminMfaMock,
  connectToDatabaseMock,
  sendDailyOrderStatusUpdateNotificationMock,
} = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
  sendDailyOrderStatusUpdateNotificationMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

vi.mock("@/lib/services/notifications", () => ({
  sendDailyOrderStatusUpdateNotification: sendDailyOrderStatusUpdateNotificationMock,
}))

import { PATCH } from "@/app/api/admin/daily-delivery/orders/[id]/status/route"
import { DELETE } from "@/app/api/admin/daily-delivery/orders/[id]/route"

function createActor(user: Record<string, unknown>, role: "user" | "admin" = "admin") {
  return {
    user: user as never,
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

async function createDailyOrderForUser(userId: unknown, overrides: Record<string, unknown> = {}) {
  return DailyDeliveryOrder.create({
    userId,
    orderId: "DD-12345678",
    items: [
      {
        day: "Monday",
        date: "April 14",
        comboId: "combo-1",
        comboName: "Chicken Combo",
        type: "A",
        quantity: 1,
        voucherType: "twoDish",
      },
    ],
    status: "pending",
    voucherCost: {
      twoDish: 1,
      threeDish: 0,
    },
    ...overrides,
  })
}

describe("admin daily order mutation routes", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    requireAdminMfaMock.mockReset()
    connectToDatabaseMock.mockReset()
    sendDailyOrderStatusUpdateNotificationMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
    sendDailyOrderStatusUpdateNotificationMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("refunds vouchers and creates a refund transaction", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ twoDishVoucher: 0, threeDishVoucher: 0 })
    const order = await createDailyOrderForUser(user._id)

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await PATCH(
      buildJsonRequest(
        `http://localhost:3000/api/admin/daily-delivery/orders/${order.orderId}/status`,
        { status: "refunded" },
        { method: "PATCH" }
      ),
      { params: Promise.resolve({ id: order.orderId }) }
    )
    const json = await response.json()
    const savedUser = await User.findById(user._id).lean()
    const savedOrder = await DailyDeliveryOrder.findOne({ orderId: order.orderId }).lean()
    const transactions = await Transaction.find().lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedUser).toMatchObject({ twoDishVoucher: 1, threeDishVoucher: 0 })
    expect(savedOrder).toMatchObject({ status: "refunded" })
    expect(savedOrder?.refundedAt).toBeTruthy()
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      userId: user._id,
      type: "refund",
      amount: 1,
      description: `Refunded daily order ${order.orderId}`,
    })
  })

  it("does not double-refund an already refunded order", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ twoDishVoucher: 0, threeDishVoucher: 0 })
    const order = await createDailyOrderForUser(user._id, {
      status: "refunded",
      refundedAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await PATCH(
      buildJsonRequest(
        `http://localhost:3000/api/admin/daily-delivery/orders/${order.orderId}/status`,
        { status: "refunded" },
        { method: "PATCH" }
      ),
      { params: Promise.resolve({ id: order.orderId }) }
    )

    expect(response.status).toBe(200)
    expect(await User.findById(user._id).lean()).toMatchObject({
      twoDishVoucher: 0,
      threeDishVoucher: 0,
    })
    expect(await Transaction.countDocuments()).toBe(0)
  })

  it("deletes an order and returns vouchers atomically when requested", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ twoDishVoucher: 1, threeDishVoucher: 0 })
    const order = await createDailyOrderForUser(user._id, {
      orderId: "DD-87654321",
      voucherCost: {
        twoDish: 2,
        threeDish: 0,
      },
    })

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await DELETE(
      buildRequest(
        `http://localhost:3000/api/admin/daily-delivery/orders/${order.orderId}?returnVouchers=true`,
        { method: "DELETE" }
      ),
      { params: Promise.resolve({ id: order.orderId }) }
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(await DailyDeliveryOrder.findOne({ orderId: order.orderId }).lean()).toBeNull()
    expect(await User.findById(user._id).lean()).toMatchObject({
      twoDishVoucher: 3,
      threeDishVoucher: 0,
    })
    expect(await Transaction.find().lean()).toMatchObject([
      expect.objectContaining({
        userId: user._id,
        type: "refund",
        amount: 2,
        description: `Refunded daily order ${order.orderId}`,
      }),
    ])
  })
})

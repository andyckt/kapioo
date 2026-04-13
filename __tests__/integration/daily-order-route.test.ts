import DailyDeliveryOrder from "@/models/DailyDeliveryOrder"
import Transaction from "@/models/Transaction"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestUser } from "../helpers/factories"
import { buildJsonRequest, buildRequest } from "../helpers/request"

const { requireUserMock, connectToDatabaseMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireUser: requireUserMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

import { GET, POST } from "@/app/api/daily-delivery/order/route"
import User from "@/models/User"

function createActor(user: Record<string, unknown>, role: "user" | "admin" = "user") {
  return {
    user: user as never,
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

describe("app/api/daily-delivery/order", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    requireUserMock.mockReset()
    connectToDatabaseMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("creates a daily order and deducts vouchers", async () => {
    const user = await createTestUser({
      twoDishVoucher: 4,
      threeDishVoucher: 2,
    })

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/daily-delivery/order", {
      items: [
        {
          day: "Monday",
          date: "April 14",
          comboId: "combo-1",
          comboName: "Chicken Combo",
          type: "A",
          quantity: 2,
          voucherType: "twoDish",
          dishes: ["Dish 1", "Dish 2"],
        },
        {
          day: "Tuesday",
          date: "April 15",
          comboId: "combo-2",
          comboName: "Beef Combo",
          type: "B",
          quantity: 1,
          voucherType: "threeDish",
          dishes: ["Dish 3"],
        },
      ],
      phoneNumber: "416-555-1234",
      area: "Downtown",
      deliveryAddress: {
        streetAddress: "123 Test St",
        province: "ON",
        postalCode: "M1M1M1",
      },
      specialInstructions: "Leave at door",
    })

    const response = await POST(request)
    const json = await response.json()
    const savedUser = await User.findById(user._id).lean()
    const savedOrders = await DailyDeliveryOrder.find().lean()
    const transactions = await Transaction.find().lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedOrders).toHaveLength(1)
    expect(savedOrders[0]).toMatchObject({
      userId: user._id,
      status: "pending",
      voucherCost: {
        twoDish: 2,
        threeDish: 1,
      },
    })
    expect(savedUser).toMatchObject({
      twoDishVoucher: 2,
      threeDishVoucher: 1,
      phone: "416-555-1234",
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      userId: user._id,
      type: "Deduct",
      amount: 3,
      description: expect.stringContaining("Placed daily order"),
    })
  })

  it("rejects orders when vouchers are insufficient", async () => {
    const user = await createTestUser({
      twoDishVoucher: 0,
    })

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/daily-delivery/order", {
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
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toMatchObject({
      success: false,
      error: "Insufficient vouchers",
    })
    expect(await DailyDeliveryOrder.countDocuments()).toBe(0)
    expect(await Transaction.countDocuments()).toBe(0)
  })

  it("rejects invalid request bodies", async () => {
    const user = await createTestUser()

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/daily-delivery/order", {
      phoneNumber: "4165550000",
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(await DailyDeliveryOrder.countDocuments()).toBe(0)
  })

  it("returns only the authenticated user's daily orders", async () => {
    const user = await createTestUser()
    const otherUser = await createTestUser()

    await DailyDeliveryOrder.create([
      {
        userId: user._id,
        orderId: "DD-10000001",
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
        voucherCost: { twoDish: 1, threeDish: 0 },
        phoneNumber: "111",
        area: "User Area",
        deliveryAddress: {
          streetAddress: "1 User St",
          province: "ON",
          postalCode: "M1M1M1",
        },
      },
      {
        userId: otherUser._id,
        orderId: "DD-10000002",
        items: [
          {
            day: "Tuesday",
            date: "April 15",
            comboId: "combo-2",
            comboName: "Beef Combo",
            type: "B",
            quantity: 1,
            voucherType: "threeDish",
          },
        ],
        voucherCost: { twoDish: 0, threeDish: 1 },
        phoneNumber: "222",
        area: "Other Area",
        deliveryAddress: {
          streetAddress: "2 Other St",
          province: "ON",
          postalCode: "M2M2M2",
        },
      },
    ])

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildRequest(
      `http://localhost:3000/api/daily-delivery/order?userId=${String(user._id)}&page=1&limit=10`
    )

    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.orders).toHaveLength(1)
    expect(json.data.orders[0].orderId).toBe("DD-10000001")
  })
})

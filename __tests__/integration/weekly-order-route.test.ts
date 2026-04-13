import User from "@/models/User"
import UserSubscription from "@/models/UserSubscription"
import Transaction from "@/models/Transaction"
import WeeklyDeliveryDay from "@/models/WeeklyDeliveryDay"
import WeeklyMealOption from "@/models/WeeklyMealOption"
import WeeklyOrder from "@/models/WeeklyOrder"

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

import { GET, POST } from "@/app/api/weekly-subscription/user/route"

function createActor(user: Record<string, unknown>, role: "user" | "admin" = "user") {
  return {
    user: user as never,
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

async function seedWeeklyCatalog() {
  const option = await WeeklyMealOption.create({
    name: "Korean Chicken",
    nameEn: "Korean Chicken",
    active: true,
    tags: ["spicy"],
  })

  await WeeklyDeliveryDay.create([
    {
      day: "sunday",
      name: "Sunday Delivery",
      date: "April 13",
      active: true,
      options: [option._id],
      weekOffset: 0,
    },
    {
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "April 15",
      active: true,
      options: [],
      weekOffset: 0,
    },
    {
      day: "sunday",
      name: "Sunday Delivery",
      date: "April 20",
      active: true,
      options: [],
      weekOffset: 1,
    },
    {
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "April 22",
      active: true,
      options: [],
      weekOffset: 1,
    },
    {
      day: "sunday",
      name: "Sunday Delivery",
      date: "April 27",
      active: true,
      options: [],
      weekOffset: 2,
    },
    {
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "April 29",
      active: true,
      options: [],
      weekOffset: 2,
    },
  ])

  return option
}

describe("app/api/weekly-subscription/user", () => {
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

  it("returns active delivery days with active options", async () => {
    const option = await seedWeeklyCatalog()

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sunday",
          weekOffset: 0,
          options: expect.arrayContaining([
            expect.objectContaining({
              id: String(option._id),
              name: "Korean Chicken",
            }),
          ]),
        }),
      ])
    )
  })

  it("creates a weekly order, subscription, and deducts the weekly voucher", async () => {
    const option = await seedWeeklyCatalog()
    const user = await createTestUser({
      weeklySIXmeals: 1,
      phone: "5550001111",
    })
    user.set("planBalances", { "weekly-6x1": 1 })
    await user.save()

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/weekly-subscription/user", {
      items: [
        {
          dayId: "sunday",
          optionId: String(option._id),
          quantity: 2,
          weekOffset: 0,
        },
      ],
      mealPlanType: "6aweek",
      deductVoucher: true,
      phoneNumber: "4165550000",
      area: "North York",
      deliveryAddress: {
        streetAddress: "456 Weekly Ave",
        province: "ON",
        postalCode: "M3M3M3",
        country: "Canada",
      },
      specialInstructions: "Ring bell",
    })

    const response = await POST(request)
    const json = await response.json()
    const savedUser = await User.findById(user._id).lean()
    const orders = await WeeklyOrder.find().lean()
    const subscriptions = await UserSubscription.find().lean()
    const transactions = await Transaction.find().lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.voucherDeducted).toBe(true)
    expect(orders).toHaveLength(1)
    expect(subscriptions).toHaveLength(1)
    expect(orders[0]).toMatchObject({
      userId: user._id,
      mealPlanType: "6aweek",
      voucherDeducted: true,
      creditCost: 2,
      items: [
        expect.objectContaining({
          dayId: "sunday",
          optionId: String(option._id),
          optionName: "Korean Chicken",
          quantity: 2,
          date: "April 13",
        }),
      ],
    })
    expect(savedUser).toMatchObject({
      weeklySIXmeals: 0,
      phone: "4165550000",
      planBalances: {
        "weekly-6x1": 0,
      },
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      userId: user._id,
      type: "Deduct",
      amount: 1,
      description: expect.stringContaining("Placed weekly order"),
    })
  })

  it("creates a legacy weekly order and deducts credits with a transaction record", async () => {
    const option = await seedWeeklyCatalog()
    const user = await createTestUser({
      credits: 5,
      phone: "5550001111",
    })

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/weekly-subscription/user", {
      items: [
        {
          dayId: "sunday",
          optionId: String(option._id),
          quantity: 2,
          weekOffset: 0,
        },
      ],
      mealPlanType: "legacy",
      deductVoucher: true,
      phoneNumber: "4165559999",
      area: "North York",
      deliveryAddress: {
        streetAddress: "789 Legacy Rd",
        province: "ON",
        postalCode: "M4M4M4",
        country: "Canada",
      },
    })

    const response = await POST(request)
    const json = await response.json()
    const savedUser = await User.findById(user._id).lean()
    const transactions = await Transaction.find().lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedUser).toMatchObject({
      credits: 3,
      phone: "4165559999",
    })
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      userId: user._id,
      type: "Deduct",
      amount: 2,
      description: expect.stringContaining("Placed weekly order"),
    })
  })

  it("rejects orders when the weekly balance is insufficient", async () => {
    const option = await seedWeeklyCatalog()
    const user = await createTestUser({
      weeklySIXmeals: 0,
    })

    requireUserMock.mockResolvedValue({
      response: null,
      actor: createActor(user),
    })

    const request = buildJsonRequest("http://localhost:3000/api/weekly-subscription/user", {
      items: [
        {
          dayId: "sunday",
          optionId: String(option._id),
          quantity: 1,
          weekOffset: 0,
        },
      ],
      mealPlanType: "6aweek",
      deductVoucher: true,
      phoneNumber: "4165550000",
      area: "North York",
      deliveryAddress: {
        streetAddress: "456 Weekly Ave",
        province: "ON",
        postalCode: "M3M3M3",
        country: "Canada",
      },
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Not enough meal plans")
    expect(await WeeklyOrder.countDocuments()).toBe(0)
    expect(await Transaction.countDocuments()).toBe(0)
  })
})

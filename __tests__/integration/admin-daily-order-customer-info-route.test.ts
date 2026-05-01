import DailyDeliveryOrder from "@/models/DailyDeliveryOrder"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"
import { buildJsonRequest } from "../helpers/request"

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

import { PATCH } from "@/app/api/admin/daily-delivery/orders/[id]/customer-info/route"

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
    orderId: "DD-CUSTOMER-INFO",
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
    phoneNumber: "4161112222",
    area: "North York",
    deliveryAddress: {
      unitNumber: "8",
      streetAddress: "123 Old Street",
      city: "Toronto",
      province: "ON",
      postalCode: "M1M1M1",
      country: "Canada",
      buzzCode: "111",
    },
    ...overrides,
  })
}

describe("admin daily order customer-info route", () => {
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

  it("persists schema-owned override fields and preserves city/province in effective info", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ name: "Customer Name", email: "customer@example.com" })
    const order = await createDailyOrderForUser(user._id)

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await PATCH(
      buildJsonRequest(
        `http://localhost:3000/api/admin/daily-delivery/orders/${order.orderId}/customer-info`,
        {
          deliveryAddress: {
            streetAddress: "500 New Street",
            city: "Markham",
            province: "ON",
            postalCode: "L3R3R3",
          },
          phoneNumber: "647 555 0000",
        },
        { method: "PATCH" }
      ),
      { params: Promise.resolve({ id: order.orderId }) }
    )

    const json = await response.json()
    const savedOrder = await DailyDeliveryOrder.findOne({ orderId: order.orderId }).lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedOrder).toMatchObject({
      orderCustomerOverride: {
        phoneNumber: "647 555 0000",
        deliveryAddress: {
          streetAddress: "500 New Street",
          city: "Markham",
          province: "ON",
          postalCode: "L3R3R3",
        },
      },
    })
    expect(savedOrder?.orderCustomerOverrideLogs).toMatchObject([
      {
        updatedBy: admin.email,
        changedFields: expect.arrayContaining([
          "phone number",
          "unit number",
          "street address",
          "city",
          "postal code",
          "country",
          "buzz code",
        ]),
        changedDetails: expect.arrayContaining([
          expect.objectContaining({
            field: "phone number",
            from: expect.any(String),
            to: "647 555 0000",
          }),
          expect.objectContaining({
            field: "street address",
            from: "123 Old Street",
            to: "500 New Street",
          }),
        ]),
      },
    ])
    expect(json.data.orderCustomerOverrideLogs?.[0]).toMatchObject({
      updatedBy: admin.email,
      changedDetails: expect.arrayContaining([expect.objectContaining({ field: "phone number" })]),
    })
    expect(json.data.effectiveCustomerInfo.deliveryAddress).toMatchObject({
      unitNumber: "8",
      streetAddress: "500 New Street",
      city: "Markham",
      province: "ON",
      postalCode: "L3R3R3",
      country: "Canada",
      buzzCode: "111",
    })
  })
})

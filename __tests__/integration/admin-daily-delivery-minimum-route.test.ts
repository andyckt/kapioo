import AuditLog from "@/models/AuditLog"
import User from "@/models/User"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"
import { buildJsonRequest } from "../helpers/request"

const { requireAdminMfaMock, connectToDatabaseMock } = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({ requireAdminMfa: requireAdminMfaMock }))
vi.mock("@/lib/db", () => ({ default: connectToDatabaseMock }))

import { PATCH } from "@/app/api/admin/users/[id]/daily-delivery-minimum/route"

describe("admin customer daily delivery minimum", () => {
  beforeAll(async () => setupTestDb())

  beforeEach(async () => {
    await clearCollections()
    requireAdminMfaMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => teardownTestDb())

  it("enables a dated one-meal exception and records the admin action", async () => {
    const admin = await createTestAdmin()
    const customer = await createTestUser()
    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: { user: admin, role: "admin", sessionVersion: 1 },
    })

    const response = await PATCH(
      buildJsonRequest("http://localhost/api/admin/users/customer/daily-delivery-minimum", {
        enabled: true,
        startsOn: "2099-09-14",
        endsOn: "2099-09-20",
      }, { method: "PATCH" }),
      { params: Promise.resolve({ id: String(customer._id) }) }
    )
    const savedCustomer = await User.findById(customer._id).lean() as any
    const audit = await AuditLog.findOne().lean()

    expect(response.status).toBe(200)
    expect(savedCustomer?.dailyDeliveryMinimumOverride).toMatchObject({
      minimumMeals: 1,
      startsOn: "2099-09-14",
      endsOn: "2099-09-20",
    })
    expect(audit).toMatchObject({
      action: "user.daily-delivery-minimum.enable",
      targetId: String(customer._id),
    })
  })

  it("turns the exception off without affecting other customer fields", async () => {
    const admin = await createTestAdmin()
    const customer = await createTestUser({
      name: "Keep This Name",
      dailyDeliveryMinimumOverride: {
        minimumMeals: 1,
        startsOn: "2099-09-14",
        endsOn: "2099-09-20",
      },
    })
    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: { user: admin, role: "admin", sessionVersion: 1 },
    })

    const response = await PATCH(
      buildJsonRequest("http://localhost/api/admin/users/customer/daily-delivery-minimum", {
        enabled: false,
      }, { method: "PATCH" }),
      { params: Promise.resolve({ id: String(customer._id) }) }
    )
    const savedCustomer = await User.findById(customer._id).lean() as any

    expect(response.status).toBe(200)
    expect(savedCustomer?.dailyDeliveryMinimumOverride).toBeUndefined()
    expect(savedCustomer?.name).toBe("Keep This Name")
  })

  it("rejects an invalid date range", async () => {
    const admin = await createTestAdmin()
    const customer = await createTestUser()
    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: { user: admin, role: "admin", sessionVersion: 1 },
    })

    const response = await PATCH(
      buildJsonRequest("http://localhost/api/admin/users/customer/daily-delivery-minimum", {
        enabled: true,
        startsOn: "2099-09-20",
        endsOn: "2099-09-14",
      }, { method: "PATCH" }),
      { params: Promise.resolve({ id: String(customer._id) }) }
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain("End date")
  })

  it("requires a verified admin session", async () => {
    const denied = new Response(JSON.stringify({ success: false, error: "Admin MFA required" }), {
      status: 403,
    })
    requireAdminMfaMock.mockResolvedValue({ response: denied, actor: null })

    const response = await PATCH(
      buildJsonRequest("http://localhost/api/admin/users/customer/daily-delivery-minimum", {
        enabled: false,
      }, { method: "PATCH" }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    )

    expect(response.status).toBe(403)
    expect(await User.countDocuments()).toBe(0)
  })
})

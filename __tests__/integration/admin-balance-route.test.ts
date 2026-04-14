import Transaction from "@/models/Transaction"
import User from "@/models/User"
import { applyBalanceMutations } from "@/lib/balances/mutations"
import { resolveWeeklyRefundTarget, toWeeklyRefundBalanceMutation } from "@/lib/orders/weekly-refund"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestAdmin, createTestUser } from "../helpers/factories"
import { buildJsonRequest } from "../helpers/request"

const { requireAdminMfaMock, connectToDatabaseMock, sendEmailMock } = vi.hoisted(() => ({
  requireAdminMfaMock: vi.fn(),
  connectToDatabaseMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAdminMfa: requireAdminMfaMock,
}))

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}))

vi.mock("@/lib/services/email", () => ({
  sendEmail: sendEmailMock,
}))

import { POST } from "@/app/api/users/[id]/update-balance/route"

function createActor(user: Record<string, unknown>, role: "user" | "admin" = "admin") {
  return {
    user: user as never,
    role,
    sessionVersion: Number(user.sessionVersion ?? 1),
  }
}

describe("app/api/users/[id]/update-balance", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    requireAdminMfaMock.mockReset()
    connectToDatabaseMock.mockReset()
    sendEmailMock.mockReset()
    connectToDatabaseMock.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("adds credits and returns transaction metadata", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ credits: 1 })

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await POST(
      buildJsonRequest(`http://localhost:3000/api/users/${String(user._id)}/update-balance`, {
        field: "credits",
        amount: 4,
        operation: "add",
        description: "Manual credit top-up",
      }),
      { params: Promise.resolve({ id: String(user._id) }) }
    )
    if (!response) {
      throw new Error("Expected update-balance route to return a response")
    }

    const json = await response.json()
    const savedUser = (await User.findById(user._id).lean()) as { credits: number } | null
    const transactions = await Transaction.find().lean()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedUser?.credits).toBe(5)
    expect(transactions).toHaveLength(1)
    expect(json.meta.transaction).toMatchObject({
      type: "Add",
      amount: 4,
      description: "Manual credit top-up",
    })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("deducts credits correctly", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ credits: 6 })

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await POST(
      buildJsonRequest(`http://localhost:3000/api/users/${String(user._id)}/update-balance`, {
        field: "credits",
        amount: 2,
        operation: "deduct",
      }),
      { params: Promise.resolve({ id: String(user._id) }) }
    )
    if (!response) {
      throw new Error("Expected update-balance route to return a response")
    }

    const savedUser = (await User.findById(user._id).lean()) as { credits: number } | null
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(savedUser?.credits).toBe(4)
  })

  it("rejects deductions larger than the available balance", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser({ credits: 1 })

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await POST(
      buildJsonRequest(`http://localhost:3000/api/users/${String(user._id)}/update-balance`, {
        field: "credits",
        amount: 5,
        operation: "deduct",
      }),
      { params: Promise.resolve({ id: String(user._id) }) }
    )
    if (!response) {
      throw new Error("Expected update-balance route to return a response")
    }

    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Insufficient credits balance")
  })

  it("returns the auth failure response for non-admin callers", async () => {
    const user = await createTestUser()

    requireAdminMfaMock.mockResolvedValue({
      response: new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
      }),
      actor: null,
    })

    const response = await POST(
      buildJsonRequest(`http://localhost:3000/api/users/${String(user._id)}/update-balance`, {
        field: "credits",
        amount: 1,
        operation: "add",
      }),
      { params: Promise.resolve({ id: String(user._id) }) }
    )
    if (!response) {
      throw new Error("Expected update-balance route to return a response")
    }

    expect(response.status).toBe(403)
  })

  it("rejects invalid balance fields", async () => {
    const admin = await createTestAdmin()
    const user = await createTestUser()

    requireAdminMfaMock.mockResolvedValue({
      response: null,
      actor: createActor(admin),
    })

    const response = await POST(
      buildJsonRequest(`http://localhost:3000/api/users/${String(user._id)}/update-balance`, {
        field: "notAField",
        amount: 1,
        operation: "add",
      }),
      { params: Promise.resolve({ id: String(user._id) }) }
    )
    if (!response) {
      throw new Error("Expected update-balance route to return a response")
    }

    expect(response.status).toBe(400)
  })
})

describe("weekly refund mutations with real user documents", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("restores legacy credits on refund", async () => {
    const user = await createTestUser({ credits: 2 })

    const refundTarget = resolveWeeklyRefundTarget({
      mealPlanType: "legacy",
      voucherDeducted: true,
      creditCost: 3,
    })
    const mutation = toWeeklyRefundBalanceMutation(refundTarget)
    if (!mutation) {
      throw new Error("Expected a credit refund mutation")
    }

    await applyBalanceMutations({
      user,
      mutations: [mutation],
      createTransaction: false,
    })

    const savedUser = (await User.findById(user._id).lean()) as { credits: number } | null

    expect(refundTarget).toEqual({ kind: "credits", amount: 3 })
    expect(savedUser?.credits).toBe(5)
  })

  it("restores weekly plan balances and legacy fields on modern plan refunds", async () => {
    const user = await createTestUser({ weeklySIXmeals: 0 })
    user.set("planBalances", { "weekly-6x1": 0 })
    await user.save()

    const refundTarget = resolveWeeklyRefundTarget({
      mealPlanType: "6aweek",
      voucherDeducted: true,
      creditCost: 6,
    })
    const mutation = toWeeklyRefundBalanceMutation(refundTarget)
    if (!mutation) {
      throw new Error("Expected a weekly-plan refund mutation")
    }

    await applyBalanceMutations({
      user,
      mutations: [mutation],
      createTransaction: false,
    })

    const savedUser = (await User.findById(user._id).lean()) as {
      weeklySIXmeals: number
      planBalances: Record<string, number>
    } | null

    expect(refundTarget).toEqual({
      kind: "weekly-plan",
      amount: 1,
      planId: "weekly-6x1",
    })
    expect(savedUser).toMatchObject({
      weeklySIXmeals: 1,
      planBalances: {
        "weekly-6x1": 1,
      },
    })
  })

  it("does nothing when no voucher was deducted", async () => {
    const user = await createTestUser({
      credits: 4,
      weeklySIXmeals: 2,
    })

    const refundTarget = resolveWeeklyRefundTarget({
      mealPlanType: "6aweek",
      voucherDeducted: false,
      creditCost: 6,
    })
    const mutation = toWeeklyRefundBalanceMutation(refundTarget)
    expect(mutation).toBeNull()

    const savedUser = (await User.findById(user._id).lean()) as {
      credits: number
      weeklySIXmeals: number
    } | null

    expect(refundTarget).toEqual({ kind: "none", amount: 0 })
    expect(savedUser).toMatchObject({
      credits: 4,
      weeklySIXmeals: 2,
    })
  })
})

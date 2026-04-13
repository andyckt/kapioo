import Transaction from "@/models/Transaction"
import User from "@/models/User"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestUser } from "../helpers/factories"

const { auditLogMock } = vi.hoisted(() => ({
  auditLogMock: vi.fn(),
}))

vi.mock("@/lib/security/audit", () => ({
  logAuditEvent: auditLogMock,
}))

import {
  applyBalanceMutations,
  BalanceMutationError,
  findBalanceMutationUser,
  isBalanceMutationField,
  toSafeUserBalanceResponse,
} from "@/lib/balances/mutations"

describe("lib/balances/mutations", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
    auditLogMock.mockReset()
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  describe("isBalanceMutationField", () => {
    it("accepts supported fields and rejects unknown ones", () => {
      expect(isBalanceMutationField("credits")).toBe(true)
      expect(isBalanceMutationField("weeklySIXmeals")).toBe(true)
      expect(isBalanceMutationField("madeUpField")).toBe(false)
    })
  })

  describe("toSafeUserBalanceResponse", () => {
    it("removes sensitive fields while keeping balances", async () => {
      const user = await createTestUser({
        credits: 4,
      })
      user.verificationCode = "123456"
      user.resetPasswordCode = "654321"
      await user.save()

      const sanitized = toSafeUserBalanceResponse(user)

      expect(sanitized.credits).toBe(4)
      expect(sanitized.password).toBeUndefined()
      expect(sanitized.salt).toBeUndefined()
      expect(sanitized.verificationCode).toBeUndefined()
      expect(sanitized.resetPasswordCode).toBeUndefined()
    })
  })

  describe("findBalanceMutationUser", () => {
    it("finds a user by object id", async () => {
      const user = await createTestUser()

      const found = await findBalanceMutationUser(String(user._id))

      expect(String(found?._id)).toBe(String(user._id))
    })

    it("finds a user by userID", async () => {
      const user = await createTestUser({
        userID: "kapioo-user-42",
      })

      const found = await findBalanceMutationUser("kapioo-user-42")

      expect(String(found?._id)).toBe(String(user._id))
    })

    it("returns null when the user does not exist", async () => {
      const found = await findBalanceMutationUser("missing-user")

      expect(found).toBeNull()
    })
  })

  describe("applyBalanceMutations", () => {
    it("adds credits and creates a transaction", async () => {
      const user = await createTestUser({ credits: 0 })

      const result = await applyBalanceMutations({
        user,
        mutations: [{ field: "credits", amount: 5, operation: "add" }],
        auditAction: "balance.add",
      })

      const reloaded = (await User.findById(user._id).lean()) as { credits: number } | null
      const transactions = await Transaction.find().lean()

      expect(result.balances.credits).toEqual({ before: 0, after: 5 })
      expect(reloaded?.credits).toBe(5)
      expect(transactions).toHaveLength(1)
      expect(transactions[0]).toMatchObject({
        userId: user._id,
        type: "Add",
        amount: 5,
      })
      expect(auditLogMock).toHaveBeenCalledTimes(1)
    })

    it("deducts credits and creates a deduct transaction", async () => {
      const user = await createTestUser({ credits: 7 })

      const result = await applyBalanceMutations({
        user,
        mutations: [{ field: "credits", amount: 3, operation: "deduct" }],
      })

      const reloaded = (await User.findById(user._id).lean()) as { credits: number } | null
      const transaction = await Transaction.findOne().lean()

      expect(result.balances.credits).toEqual({ before: 7, after: 4 })
      expect(reloaded?.credits).toBe(4)
      expect(transaction?.type).toBe("Deduct")
    })

    it("rejects insufficient balances", async () => {
      const user = await createTestUser({ credits: 1 })

      await expect(
        applyBalanceMutations({
          user,
          mutations: [{ field: "credits", amount: 2, operation: "deduct" }],
        })
      ).rejects.toMatchObject({
        name: "BalanceMutationError",
        code: "INSUFFICIENT_BALANCE",
      })
    })

    it("keeps weekly fields and planBalances in sync", async () => {
      const user = await createTestUser({ weeklySIXmeals: 1 })

      const result = await applyBalanceMutations({
        user,
        mutations: [{ field: "weeklySIXmeals", amount: 2, operation: "add" }],
      })

      const reloaded = (await User.findById(user._id).lean()) as {
        weeklySIXmeals: number
        planBalances: Record<string, number>
      } | null

      expect(result.balances.weeklySIXmeals).toEqual({ before: 1, after: 3 })
      expect(reloaded?.weeklySIXmeals).toBe(3)
      expect(reloaded?.planBalances).toMatchObject({
        "weekly-6x1": 3,
      })
    })

    it("supports multiple mutations in one transaction record", async () => {
      const user = await createTestUser({
        credits: 2,
        twoDishVoucher: 1,
      })

      const result = await applyBalanceMutations({
        user,
        mutations: [
          { field: "credits", amount: 3, operation: "add" },
          { field: "twoDishVoucher", amount: 2, operation: "add" },
        ],
      })

      const reloaded = await User.findById(user._id).lean()

      expect(result.balances.credits).toEqual({ before: 2, after: 5 })
      expect(result.balances.twoDishVoucher).toEqual({ before: 1, after: 3 })
      expect(reloaded).toMatchObject({
        credits: 5,
        twoDishVoucher: 3,
      })
      expect(await Transaction.countDocuments()).toBe(1)
    })

    it("rejects mixed add and deduct operations without an explicit transaction type", async () => {
      const user = await createTestUser({
        credits: 5,
        twoDishVoucher: 2,
      })

      await expect(
        applyBalanceMutations({
          user,
          mutations: [
            { field: "credits", amount: 1, operation: "add" },
            { field: "twoDishVoucher", amount: 1, operation: "deduct" },
          ],
        })
      ).rejects.toMatchObject({
        code: "MIXED_MUTATION_OPERATIONS",
      })
    })

    it("can skip transaction creation", async () => {
      const user = await createTestUser({ credits: 3 })

      const result = await applyBalanceMutations({
        user,
        mutations: [{ field: "credits", amount: 2, operation: "add" }],
        createTransaction: false,
      })

      expect(result.transaction).toBeNull()
      expect(await Transaction.countDocuments()).toBe(0)
    })

    it("rejects invalid mutation entries", async () => {
      const user = await createTestUser({ credits: 3 })

      await expect(
        applyBalanceMutations({
          user,
          mutations: [{ field: "notAField" as never, amount: 1, operation: "add" }],
        })
      ).rejects.toMatchObject({
        code: "INVALID_BALANCE_FIELD",
      })

      await expect(
        applyBalanceMutations({
          user,
          mutations: [{ field: "credits", amount: 0, operation: "add" }],
        })
      ).rejects.toMatchObject({
        code: "INVALID_BALANCE_AMOUNT",
      })

      await expect(
        applyBalanceMutations({
          user,
          mutations: [{ field: "credits", amount: -1, operation: "add" }],
        })
      ).rejects.toMatchObject({
        code: "INVALID_BALANCE_AMOUNT",
      })
    })
  })
})

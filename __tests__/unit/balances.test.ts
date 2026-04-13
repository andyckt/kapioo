import {
  decrementBalance,
  getBalance,
  incrementBalance,
  seedWeeklyPlanBalances,
} from "@/lib/plans/balances"

describe("lib/plans/balances", () => {
  describe("getBalance", () => {
    it("returns the direct plan balance when present", () => {
      const user = {
        planBalances: {
          "daily-2dish-10": 4,
        },
      }

      expect(getBalance(user, "daily-2dish-10")).toBe(4)
    })

    it("falls back to the legacy weekly field when the weekly plan balance is missing", () => {
      const user = {
        weeklySIXmeals: 2,
      }

      expect(getBalance(user, "weekly-6x1")).toBe(2)
    })

    it("supports a Map-backed planBalances object", () => {
      const user = {
        planBalances: new Map([["weekly-8x1", 3]]),
      }

      expect(getBalance(user, "weekly-8x1")).toBe(3)
    })

    it("returns zero for missing, invalid, or non-weekly balances", () => {
      const user = {
        planBalances: {
          "daily-2dish-10": Number.NaN,
        },
      }

      expect(getBalance(user, "daily-2dish-10")).toBe(0)
      expect(getBalance(user, "weekly-10x1")).toBe(0)
      expect(getBalance(user, "unknown-plan")).toBe(0)
    })
  })

  describe("incrementBalance", () => {
    it("increments only planBalances for non-weekly plans", () => {
      const user: { planBalances?: Record<string, number> } = {}

      incrementBalance(user, "daily-2dish-10", 2)
      incrementBalance(user, "daily-2dish-10", 3)

      expect(user.planBalances).toEqual({
        "daily-2dish-10": 5,
      })
    })

    it("keeps weekly legacy fields and planBalances in sync", () => {
      const user: { weeklySIXmeals: number; planBalances?: Record<string, number> } = {
        weeklySIXmeals: 1,
      }

      incrementBalance(user, "weekly-6x1", 2)

      expect(user.weeklySIXmeals).toBe(3)
      expect(user.planBalances).toEqual({
        "weekly-6x1": 3,
      })
    })

    it("creates a fresh planBalances object when it is missing", () => {
      const user: Record<string, unknown> = {}

      incrementBalance(user, "weekly-8x1", 1)

      expect(user).toMatchObject({
        weeklyEIGHTmeals: 1,
        planBalances: {
          "weekly-8x1": 1,
        },
      })
    })
  })

  describe("decrementBalance", () => {
    it("subtracts from non-weekly balances", () => {
      const user = {
        planBalances: {
          "daily-2dish-10": 5,
        },
      }

      decrementBalance(user, "daily-2dish-10", 2)

      expect(user.planBalances["daily-2dish-10"]).toBe(3)
    })

    it("subtracts from weekly balances and allows negative values", () => {
      const user: { weeklyTENmeals: number; planBalances?: Record<string, number> } = {
        weeklyTENmeals: 1,
      }

      decrementBalance(user, "weekly-10x1", 3)

      expect(user.weeklyTENmeals).toBe(-2)
      expect(user.planBalances).toEqual({
        "weekly-10x1": -2,
      })
    })
  })

  describe("seedWeeklyPlanBalances", () => {
    it("copies positive legacy weekly fields into missing planBalances entries", () => {
      const user: {
        weeklySIXmeals: number
        weeklyEIGHTmeals: number
        weeklyTENmeals: number
        planBalances?: Record<string, number>
      } = {
        weeklySIXmeals: 2,
        weeklyEIGHTmeals: 0,
        weeklyTENmeals: 1,
      }

      seedWeeklyPlanBalances(user)

      expect(user.planBalances).toEqual({
        "weekly-6x1": 2,
        "weekly-10x1": 1,
      })
    })

    it("does not overwrite existing planBalances entries", () => {
      const user = {
        weeklySIXmeals: 5,
        planBalances: {
          "weekly-6x1": 1,
          "weekly-12x1": 4,
        },
        weeklyTWELVEmeals: 9,
      }

      seedWeeklyPlanBalances(user)

      expect(user.planBalances).toEqual({
        "weekly-6x1": 1,
        "weekly-12x1": 4,
      })
    })

    it("supports Map-backed planBalances and ignores non-positive legacy values", () => {
      const user = {
        planBalances: new Map<string, number>([["weekly-16x1", 3]]),
        weeklySIXTEENmeals: 9,
        weeklyEIGHTmeals: -1,
      }

      seedWeeklyPlanBalances(user)

      expect(user.planBalances).toEqual({
        "weekly-16x1": 3,
      })
    })
  })
})

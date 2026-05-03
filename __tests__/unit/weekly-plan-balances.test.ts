import {
  getWeeklyPlanBalanceRows,
  listWeeklyPlanBalanceOptions,
} from "@/lib/plans/balances"

describe("weekly plan balance display helpers", () => {
  it("derives weekly balance options from active weekly plan families", () => {
    expect(listWeeklyPlanBalanceOptions().map((plan) => plan.mealsPerWeek)).toEqual([
      6,
      8,
      10,
      12,
      16,
    ])
  })

  it("includes the 16-meal balance row from legacy user balances", () => {
    const rows = getWeeklyPlanBalanceRows({
      weeklySIXmeals: 1,
      weeklySIXTEENmeals: 3,
    })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mealsPerWeek: 6, balance: 1 }),
        expect.objectContaining({ mealsPerWeek: 16, balance: 3 }),
      ])
    )
  })
})

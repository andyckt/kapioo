import {
  aggregateWeeklyCombos,
  splitWeeklyComboDishes,
} from "@/lib/agents/kitchen/aggregate-weekly-combos";
import type { WeeklyOrderItemForKitchen } from "@/lib/agents/kitchen/types";

function buildWeeklyItem(
  optionName: string,
  quantity: number
): WeeklyOrderItemForKitchen {
  return {
    dayId: "sunday",
    optionId: "option-1",
    optionName,
    quantity,
    date: "May 31",
  };
}

describe("splitWeeklyComboDishes", () => {
  it("splits combo names on ' + ' into individual dishes", () => {
    expect(splitWeeklyComboDishes("豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭")).toEqual([
      "豆花水煮牛肉",
      "红烧白萝卜香菇",
      "糙米饭",
    ]);
  });

  it("returns a single dish when no separator is present", () => {
    expect(splitWeeklyComboDishes("Korean Chicken")).toEqual(["Korean Chicken"]);
  });
});

describe("aggregateWeeklyCombos", () => {
  it("assigns the same total servings to each dish in a combo", () => {
    const items = [
      buildWeeklyItem("豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭", 10),
      buildWeeklyItem("豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭", 11),
    ];

    const combos = aggregateWeeklyCombos(items);
    expect(combos).toHaveLength(1);
    expect(combos[0].combo_name).toBe("豆花水煮牛肉 + 红烧白萝卜香菇 + 糙米饭");
    expect(combos[0].dishes).toEqual([
      { dish_name: "豆花水煮牛肉", servings: 21 },
      { dish_name: "红烧白萝卜香菇", servings: 21 },
      { dish_name: "糙米饭", servings: 21 },
    ]);
  });

  it("handles single-name weekly options as one dish line", () => {
    const combos = aggregateWeeklyCombos([buildWeeklyItem("Korean Chicken", 5)]);
    expect(combos[0].dishes).toEqual([{ dish_name: "Korean Chicken", servings: 5 }]);
  });
});

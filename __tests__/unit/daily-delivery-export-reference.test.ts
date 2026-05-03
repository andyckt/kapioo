import {
  buildAbThreeDishSummaryRow,
  buildTwoDishDishSetsByMenuName,
  formatReferenceCellForComboColumn,
  sortedThreeDishComboKeys,
} from "@/lib/orders/daily-delivery-export-reference";

describe("daily-delivery-export-reference", () => {
  it("sortedThreeDishComboKeys orders 套餐 1 before 套餐 2", () => {
    const keys = ["套餐 2 (3-dish)", "套餐 1 (3-dish)"];
    expect(sortedThreeDishComboKeys(keys)).toEqual(["套餐 1 (3-dish)", "套餐 2 (3-dish)"]);
  })

  it("buildAbThreeDishSummaryRow puts first two 3-dish summaries in A1 and B1 slots only", () => {
    const map = new Map<string, Set<string>>();
    map.set("套餐 1 (2-dish)", new Set(["a", "b"]));
    map.set("套餐 1 (3-dish)", new Set(["a", "b", "c"]));
    map.set("套餐 2 (2-dish)", new Set(["x"]));
    map.set("套餐 2 (3-dish)", new Set(["x", "y"]));

    const comboKeys = [
      "套餐 1 (2-dish)",
      "套餐 1 (3-dish)",
      "套餐 2 (2-dish)",
      "套餐 2 (3-dish)",
    ];
    const row = buildAbThreeDishSummaryRow(10, comboKeys, map);
    expect(String(row[0]).split("\n")[0]).toBe("套餐 1");
    expect(String(row[1]).split("\n")[0]).toBe("套餐 2");
    expect(row.slice(2).every((c) => c === "")).toBe(true);
  })

  it("aligns 3-dish reference text with header dish lists and tags extras vs 2-dish", () => {
    const map = new Map<string, Set<string>>();
    map.set("套餐 1 (2-dish)", new Set(["豌豆爆炒牛肉粒", "时蔬", "紫米饭"]));
    map.set(
      "套餐 1 (3-dish)",
      new Set(["豌豆爆炒牛肉粒", "时蔬", "紫米饭", "🍤和风芥末虾球"])
    );

    const twoByMenu = buildTwoDishDishSetsByMenuName(map);
    const cell = formatReferenceCellForComboColumn(
      "套餐 1 (3-dish)",
      map.get("套餐 1 (3-dish)")!,
      twoByMenu
    );

    expect(cell.split("\n")[0]).toBe("套餐 1");
    expect(cell).toContain("1. 豌豆爆炒牛肉粒");
    expect(cell).toContain("🍤和风芥末虾球 (3菜)");
  })
})

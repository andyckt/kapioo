import type { DailyOrderBase } from "@/lib/order-data/types";

import type { KitchenDailyCombo, KitchenDishRole } from "./types";

type ComboAccumulator = {
  comboName: string;
  dishServings: Map<string, number>;
  commonDishes: Set<string>;
  hasTypeA: boolean;
  hasTypeB: boolean;
};

function isTwoDishLine(type: string, voucherType: string): boolean {
  return type === "A" || voucherType === "twoDish";
}

function isThreeDishLine(type: string, voucherType: string): boolean {
  return type === "B" || voucherType === "threeDish";
}

function getOrCreateCombo(
  combos: Map<string, ComboAccumulator>,
  comboName: string
): ComboAccumulator {
  const existing = combos.get(comboName);
  if (existing) {
    return existing;
  }

  const created: ComboAccumulator = {
    comboName,
    dishServings: new Map(),
    commonDishes: new Set(),
    hasTypeA: false,
    hasTypeB: false,
  };
  combos.set(comboName, created);
  return created;
}

function addDishServings(
  combo: ComboAccumulator,
  dishes: string[],
  quantity: number,
  markCommon: boolean
) {
  if (quantity <= 0) {
    return;
  }

  for (const dish of dishes) {
    const trimmed = dish.trim();
    if (!trimmed) {
      continue;
    }

    combo.dishServings.set(trimmed, (combo.dishServings.get(trimmed) ?? 0) + quantity);
    if (markCommon) {
      combo.commonDishes.add(trimmed);
    }
  }
}

export type AggregateDailyCombosResult = {
  combos: KitchenDailyCombo[];
  warnings: string[];
};

export function aggregateDailyCombos(orders: DailyOrderBase[]): AggregateDailyCombosResult {
  const comboMap = new Map<string, ComboAccumulator>();
  const warnings: string[] = [];

  for (const order of orders) {
    for (const line of order.mealSummary.lines) {
      const comboName = line.comboName.trim() || "Unknown Combo";
      const combo = getOrCreateCombo(comboMap, comboName);
      const quantity = line.quantity > 0 ? line.quantity : 0;
      const dishes = line.dishes.length > 0 ? line.dishes : [];

      if (isTwoDishLine(line.type, line.voucherType)) {
        combo.hasTypeA = true;
        addDishServings(combo, dishes, quantity, true);
      } else if (isThreeDishLine(line.type, line.voucherType)) {
        combo.hasTypeB = true;
        addDishServings(combo, dishes, quantity, false);
      } else {
        addDishServings(combo, dishes, quantity, false);
      }
    }
  }

  const combos: KitchenDailyCombo[] = Array.from(comboMap.values())
    .sort((a, b) => a.comboName.localeCompare(b.comboName, "zh"))
    .map((combo) => {
      if (combo.hasTypeB && !combo.hasTypeA) {
        warnings.push(
          `Daily combo "${combo.comboName}" has only 3-dish orders; common/extra dish roles may be inaccurate.`
        );
      }

      const dishes = Array.from(combo.dishServings.entries())
        .sort(([a], [b]) => a.localeCompare(b, "zh"))
        .map(([dishName, servings]) => {
          const dishRole: KitchenDishRole = combo.commonDishes.has(dishName)
            ? "common"
            : "extra";
          return {
            dish_name: dishName,
            servings,
            dish_role: dishRole,
          };
        });

      return {
        combo_name: combo.comboName,
        dishes,
      };
    });

  return { combos, warnings };
}

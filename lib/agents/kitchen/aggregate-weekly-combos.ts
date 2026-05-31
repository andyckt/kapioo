import type { WeeklyOrderItemForKitchen, KitchenWeeklyCombo } from "./types";

const WEEKLY_DISH_SEPARATOR = /\s*\+\s*/;

export function splitWeeklyComboDishes(optionName: string): string[] {
  const trimmed = optionName.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(WEEKLY_DISH_SEPARATOR)
    .map((dish) => dish.trim())
    .filter(Boolean);
}

export function aggregateWeeklyCombos(items: WeeklyOrderItemForKitchen[]): KitchenWeeklyCombo[] {
  const comboTotals = new Map<string, number>();

  for (const item of items) {
    const comboName = item.optionName.trim() || "Unknown Combo";
    const quantity = item.quantity > 0 ? item.quantity : 0;
    if (quantity <= 0) {
      continue;
    }

    comboTotals.set(comboName, (comboTotals.get(comboName) ?? 0) + quantity);
  }

  return Array.from(comboTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh"))
    .map(([comboName, totalServings]) => {
      const dishNames = splitWeeklyComboDishes(comboName);
      const dishes =
        dishNames.length > 0
          ? dishNames.map((dishName) => ({
              dish_name: dishName,
              servings: totalServings,
            }))
          : [
              {
                dish_name: comboName,
                servings: totalServings,
              },
            ];

      return {
        combo_name: comboName,
        dishes,
      };
    });
}

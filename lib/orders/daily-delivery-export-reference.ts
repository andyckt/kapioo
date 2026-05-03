const COMBO_KEY_2_DISH_SUFFIX = " (2-dish)";
const COMBO_KEY_3_DISH_SUFFIX = " (3-dish)";

export function comboMenuNameFromKey(comboKey: string): string {
  if (comboKey.endsWith(COMBO_KEY_2_DISH_SUFFIX)) {
    return comboKey.slice(0, -COMBO_KEY_2_DISH_SUFFIX.length);
  }
  if (comboKey.endsWith(COMBO_KEY_3_DISH_SUFFIX)) {
    return comboKey.slice(0, -COMBO_KEY_3_DISH_SUFFIX.length);
  }
  return comboKey;
}

/** Map 套餐名 → dishes seen on 2-dish (type A) lines, for tagging 3菜 rows on 3-dish columns. */
export function buildTwoDishDishSetsByMenuName(
  comboDetailsMap: Map<string, Set<string>>
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [key, dishes] of comboDetailsMap) {
    if (key.endsWith(COMBO_KEY_2_DISH_SUFFIX)) {
      result.set(comboMenuNameFromKey(key), new Set(dishes));
    }
  }
  return result;
}

/** Multi-line reference cell for one combo quantity column (same dish set as the header). */
export function formatReferenceCellForComboColumn(
  comboKey: string,
  dishes: Set<string>,
  twoDishDishesByMenuName: Map<string, Set<string>>
): string {
  const menuName = comboMenuNameFromKey(comboKey);
  const dishList = Array.from(dishes);
  if (dishList.length === 0) {
    return menuName;
  }

  const twoDishSet = twoDishDishesByMenuName.get(menuName) ?? new Set<string>();
  const isThreeDishCol = comboKey.endsWith(COMBO_KEY_3_DISH_SUFFIX);

  let text = menuName;
  dishList.forEach((dish, index) => {
    const tag3 =
      isThreeDishCol && twoDishSet.size > 0 && !twoDishSet.has(dish) ? " (3菜)" : "";
    text += `\n${index + 1}. ${dish}${tag3}`;
  });
  return text;
}

const THREE_DISH_LOCALE = "zh-Hans-CN";

/** 3-dish combo keys sorted by 套餐 name (numeric-aware), e.g. 套餐 1 before 套餐 2. */
export function sortedThreeDishComboKeys(comboKeys: string[]): string[] {
  return comboKeys
    .filter((k) => k.endsWith(COMBO_KEY_3_DISH_SUFFIX))
    .sort((a, b) =>
      comboMenuNameFromKey(a).localeCompare(comboMenuNameFromKey(b), THREE_DISH_LOCALE, {
        numeric: true,
      })
    );
}

/**
 * Row 1 convention: A1 = first menu 3-dish combo summary, B1 = second; all other cells empty.
 * Matches legacy admin expectation while quantity columns stay aligned from row 2.
 */
export function buildAbThreeDishSummaryRow(
  headersLength: number,
  comboKeys: string[],
  comboDetailsMap: Map<string, Set<string>>
): unknown[] {
  const row: unknown[] = new Array(headersLength).fill("");
  const twoDishByMenuName = buildTwoDishDishSetsByMenuName(comboDetailsMap);
  const threeDishKeys = sortedThreeDishComboKeys(comboKeys);

  if (headersLength >= 1 && threeDishKeys[0]) {
    row[0] = formatReferenceCellForComboColumn(
      threeDishKeys[0],
      comboDetailsMap.get(threeDishKeys[0]) ?? new Set(),
      twoDishByMenuName
    );
  }
  if (headersLength >= 2 && threeDishKeys[1]) {
    row[1] = formatReferenceCellForComboColumn(
      threeDishKeys[1],
      comboDetailsMap.get(threeDishKeys[1]) ?? new Set(),
      twoDishByMenuName
    );
  }

  return row;
}

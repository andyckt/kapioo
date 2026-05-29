import {
  getAdminOrderItemDishes,
  getDailyComboTypeLabel,
} from "@/lib/orders/admin-order-item-display";
import type {
  DailyOrderBaseItem,
  DailyOrderMealSummary,
  DailyOrderMealSummaryLine,
} from "@/lib/order-data/types";

type VoucherCostLike = {
  twoDish?: number;
  threeDish?: number;
};

function deriveVoucherCountsFromItems(items: DailyOrderBaseItem[]): {
  twoDish: number;
  threeDish: number;
} {
  return items.reduce(
    (totals, item) => {
      const quantity = item.quantity > 0 ? item.quantity : 0;
      if (item.voucherType === "twoDish" || item.type === "A") {
        totals.twoDish += quantity;
      } else if (item.voucherType === "threeDish" || item.type === "B") {
        totals.threeDish += quantity;
      }
      return totals;
    },
    { twoDish: 0, threeDish: 0 }
  );
}

function buildSummaryLine(item: DailyOrderBaseItem): DailyOrderMealSummaryLine {
  const typeLabel = getDailyComboTypeLabel(item.type) || "Order";
  return {
    comboName: item.comboName || "Combo",
    type: item.type,
    typeLabel,
    quantity: item.quantity > 0 ? item.quantity : 1,
    voucherType: item.voucherType,
    dishes: item.dishes.length > 0 ? item.dishes : getAdminOrderItemDishes(item),
  };
}

export function summarizeDailyOrderItems(
  items: DailyOrderBaseItem[],
  voucherCost?: VoucherCostLike | null
): DailyOrderMealSummary {
  const lines = items.map(buildSummaryLine);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  const derived = deriveVoucherCountsFromItems(items);
  const hasStoredVoucherCost =
    voucherCost &&
    (Number(voucherCost.twoDish) > 0 || Number(voucherCost.threeDish) > 0);

  const twoDishVouchers = hasStoredVoucherCost
    ? Number(voucherCost?.twoDish) || 0
    : derived.twoDish;
  const threeDishVouchers = hasStoredVoucherCost
    ? Number(voucherCost?.threeDish) || 0
    : derived.threeDish;

  const summaryText = lines
    .map((line) => `${line.comboName} (${line.typeLabel}) x${line.quantity}`)
    .join(", ");

  return {
    totalQuantity,
    twoDishVouchers,
    threeDishVouchers,
    lines,
    summaryText,
  };
}

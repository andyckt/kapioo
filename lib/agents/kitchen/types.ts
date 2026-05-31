import type { DailyOrderStatus } from "@/lib/contracts/daily-order";

export const KITCHEN_INCLUDE_STATUSES: DailyOrderStatus[] = ["pending", "confirmed"];

export type KitchenSourceFilter = "daily" | "weekly" | "all";

export type KitchenDishRole = "common" | "extra";

export type KitchenDailyDish = {
  dish_name: string;
  servings: number;
  dish_role: KitchenDishRole;
};

export type KitchenWeeklyDish = {
  dish_name: string;
  servings: number;
};

export type KitchenDailyCombo = {
  combo_name: string;
  dishes: KitchenDailyDish[];
};

export type KitchenWeeklyCombo = {
  combo_name: string;
  dishes: KitchenWeeklyDish[];
};

export type KitchenSourceSection<TCombo> = {
  source_type: "daily" | "weekly";
  orders_count: number;
  combos: TCombo[];
};

export type KitchenExcludedOrderSummary = {
  cancelled: number;
  refunded: number;
  unpaid: number;
  wrong_date: number;
};

export type KitchenOrdersResponse = {
  target_delivery_date: string;
  daily: KitchenSourceSection<KitchenDailyCombo>;
  weekly: KitchenSourceSection<KitchenWeeklyCombo>;
  warnings: string[];
  debug: {
    included_order_ids: string[];
    excluded_order_summary: KitchenExcludedOrderSummary;
  };
};

export type WeeklyOrderItemForKitchen = {
  dayId: string;
  optionId: string;
  optionName: string;
  quantity: number;
  date: string;
};

export type WeeklyOrderForKitchen = {
  orderId: string;
  status: DailyOrderStatus;
  items: WeeklyOrderItemForKitchen[];
};

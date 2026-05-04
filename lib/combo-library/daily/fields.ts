import type { ComboLibraryFieldDefinition } from "@/lib/combo-library/shared/fields"

export type DailyComboLibraryFieldKey =
  | "internalName"
  | "typeADishes"
  | "typeBDishes"
  | "calories"
  | "tags"

export const DAILY_COMBO_LIBRARY_FIELDS = [
  {
    key: "internalName",
    label: "Internal Name",
    csvSample: "鸡肉套餐素材",
    placeholder: "Admin-only library name",
    required: true,
  },
  {
    key: "typeADishes",
    label: "Type A · 2-dish voucher",
    csvSample: "鸡肉;花菜",
    placeholder: "One dish per line",
    required: true,
    isArray: true,
  },
  {
    key: "typeBDishes",
    label: "Type B · 3-dish voucher",
    csvSample: "鸡肉;花菜;米饭",
    placeholder: "One dish per line",
    required: true,
    isArray: true,
  },
  {
    key: "calories",
    label: "Calories",
    csvSample: "650",
    required: true,
  },
  {
    key: "tags",
    label: "Tags",
    csvSample: "高蛋白;鸡肉",
    placeholder: "Separate tags with semicolons",
    isArray: true,
  },
] as const satisfies readonly ComboLibraryFieldDefinition<DailyComboLibraryFieldKey>[]

export const DAILY_COMBO_LIBRARY_LEGACY_CSV_COLUMNS = ["dishes"] as const

export const DAILY_COMBO_LIBRARY_HEADER_ALIASES: Record<string, DailyComboLibraryFieldKey | "dishes"> = {
  name: "internalName",
  displayname: "internalName",
  display_name: "internalName",
  adminname: "internalName",
  admin_name: "internalName",
  typeadishes: "typeADishes",
  typea_dishes: "typeADishes",
  typebdishes: "typeBDishes",
  typeb_dishes: "typeBDishes",
}

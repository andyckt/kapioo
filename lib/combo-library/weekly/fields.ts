import type { ComboLibraryFieldDefinition } from "@/lib/combo-library/shared/fields"

export type WeeklyComboLibraryFieldKey =
  | "internalName"
  | "name"
  | "nameEn"
  | "calories"
  | "tags"
  | "allergens"
  | "description"

export const WEEKLY_COMBO_LIBRARY_FIELDS = [
  {
    key: "internalName",
    label: "Internal Name",
    csvSample: "周餐素材A",
    placeholder: "Admin-only library name",
    required: true,
  },
  {
    key: "name",
    label: "Name (Chinese)",
    csvSample: "橄榄菜肉末豆角 + 番茄花菜 + 紫米饭",
    placeholder: "Customer-facing Chinese name",
    required: true,
  },
  {
    key: "nameEn",
    label: "Name (English)",
    csvSample: "Stir-Fried Green Beans with Minced Pork",
    placeholder: "Customer-facing English name",
  },
  {
    key: "tags",
    label: "Tags",
    csvSample: "581kcal",
    placeholder: "Separate tags with semicolons",
    isArray: true,
  },
  {
    key: "calories",
    label: "Calories",
    csvSample: "650",
  },
  {
    key: "allergens",
    label: "Allergens",
    csvSample: "soy;sesame",
    placeholder: "Separate allergens with semicolons",
    isArray: true,
  },
  {
    key: "description",
    label: "Description",
    csvSample: "这份餐包含三道菜",
  },
] as const satisfies readonly ComboLibraryFieldDefinition<WeeklyComboLibraryFieldKey>[]

export const WEEKLY_COMBO_LIBRARY_HEADER_ALIASES: Record<string, WeeklyComboLibraryFieldKey> = {
  chinesename: "name",
  chinese_name: "name",
  displayname: "internalName",
  display_name: "internalName",
  englishname: "nameEn",
  english_name: "nameEn",
  adminname: "internalName",
  admin_name: "internalName",
  namechinese: "name",
  name_chinese: "name",
  nameenglish: "nameEn",
  name_english: "nameEn",
}

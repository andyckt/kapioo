import type { ComboLibraryFieldDefinition } from "@/lib/combo-library/shared/fields"

export type WeeklyComboLibraryFieldKey =
  | "internalName"
  | "name"
  | "nameEn"
  | "calories"
  | "proteinGrams"
  | "tags"
  | "tagsEn"
  | "allergens"
  | "allergensEn"
  | "description"
  | "descriptionEn"

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
    label: "Tags Chinese (optional)",
    csvHeader: "tags (optional)",
    csvSample: "581kcal",
    placeholder: "Separate Chinese tags with semicolons",
    isArray: true,
  },
  {
    key: "tagsEn",
    label: "Tags English (optional)",
    csvHeader: "tagsEn (optional)",
    csvSample: "581kcal",
    placeholder: "Separate English tags with semicolons",
    isArray: true,
  },
  {
    key: "calories",
    label: "Calories",
    csvSample: "650",
  },
  {
    key: "proteinGrams",
    label: "Protein (g) (optional)",
    csvHeader: "proteinGrams (optional)",
    csvSample: "32",
  },
  {
    key: "allergens",
    label: "Allergens Chinese (optional)",
    csvHeader: "allergens (optional)",
    csvSample: "大豆;芝麻",
    placeholder: "Separate Chinese allergens with semicolons",
    isArray: true,
  },
  {
    key: "allergensEn",
    label: "Allergens English (optional)",
    csvHeader: "allergensEn (optional)",
    csvSample: "soy;sesame",
    placeholder: "Separate English allergens with semicolons",
    isArray: true,
  },
  {
    key: "description",
    label: "Description Chinese (optional)",
    csvHeader: "description (optional)",
    csvSample: "这份餐包含三道菜",
  },
  {
    key: "descriptionEn",
    label: "Description English (optional)",
    csvHeader: "descriptionEn (optional)",
    csvSample: "A balanced weekly combo with three dishes.",
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
  protein: "proteinGrams",
  proteingrams: "proteinGrams",
  protein_grams: "proteinGrams",
  english_tags: "tagsEn",
  tagsenglish: "tagsEn",
  tags_english: "tagsEn",
  english_allergens: "allergensEn",
  allergensenglish: "allergensEn",
  allergens_english: "allergensEn",
  english_description: "descriptionEn",
  descriptionenglish: "descriptionEn",
  description_english: "descriptionEn",
}

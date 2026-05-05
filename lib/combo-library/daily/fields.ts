import type { ComboLibraryFieldDefinition } from "@/lib/combo-library/shared/fields"

export type DailyComboLibraryFieldKey =
  | "internalName"
  | "typeADishes"
  | "typeADishesEn"
  | "typeBDishes"
  | "typeBDishesEn"
  | "calories"
  | "proteinGrams"
  | "tags"
  | "tagsEn"
  | "allergensZh"
  | "allergensEn"
  | "descriptionZh"
  | "descriptionEn"

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
    key: "typeADishesEn",
    label: "Type A English dish names (optional)",
    csvHeader: "typeADishesEn (optional)",
    csvSample: "Chicken;Cauliflower",
    placeholder: "One English dish name per line, same order as Type A",
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
    key: "typeBDishesEn",
    label: "Type B English dish names (optional)",
    csvHeader: "typeBDishesEn (optional)",
    csvSample: "Chicken;Cauliflower;Rice",
    placeholder: "One English dish name per line, same order as Type B",
    isArray: true,
  },
  {
    key: "calories",
    label: "Calories",
    csvSample: "650",
    required: true,
  },
  {
    key: "proteinGrams",
    label: "Protein grams (optional)",
    csvHeader: "proteinGrams (optional)",
    csvSample: "32",
    placeholder: "Protein amount in grams, e.g. 32",
  },
  {
    key: "tags",
    label: "Tags Chinese (optional)",
    csvHeader: "tags (optional)",
    csvSample: "高蛋白;鸡肉",
    placeholder: "Separate Chinese tags with semicolons",
    isArray: true,
  },
  {
    key: "tagsEn",
    label: "Tags English (optional)",
    csvHeader: "tagsEn (optional)",
    csvSample: "High protein;Chicken",
    placeholder: "Separate English tags with semicolons, same order as tags",
    isArray: true,
  },
  {
    key: "allergensZh",
    label: "Allergens Chinese (optional)",
    csvHeader: "allergensZh (optional)",
    csvSample: "大豆;芝麻",
    placeholder: "Separate Chinese allergens with semicolons",
    isArray: true,
  },
  {
    key: "allergensEn",
    label: "Allergens English (optional)",
    csvHeader: "allergensEn (optional)",
    csvSample: "Soy;Sesame",
    placeholder: "Separate English allergens with semicolons",
    isArray: true,
  },
  {
    key: "descriptionZh",
    label: "Description Chinese (optional)",
    csvHeader: "descriptionZh (optional)",
    csvSample: "清爽高蛋白组合，适合午餐。",
    placeholder: "Chinese customer-facing description",
  },
  {
    key: "descriptionEn",
    label: "Description English (optional)",
    csvHeader: "descriptionEn (optional)",
    csvSample: "A light high-protein lunch combo.",
    placeholder: "English customer-facing description",
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
  typeaenglishdishes: "typeADishesEn",
  typeaenglishdishnames: "typeADishesEn",
  typeadishesen: "typeADishesEn",
  typea_dishes_en: "typeADishesEn",
  typebdishes: "typeBDishes",
  typeb_dishes: "typeBDishes",
  typebenglishdishes: "typeBDishesEn",
  typebenglishdishnames: "typeBDishesEn",
  typebdishesen: "typeBDishesEn",
  typeb_dishes_en: "typeBDishesEn",
  protein: "proteinGrams",
  proteingrams: "proteinGrams",
  protein_grams: "proteinGrams",
  english_tags: "tagsEn",
  tagsenglish: "tagsEn",
  chineseallergens: "allergensZh",
  allergenschinese: "allergensZh",
  englishallergens: "allergensEn",
  allergensenglish: "allergensEn",
  chinesedescription: "descriptionZh",
  descriptionchinese: "descriptionZh",
  englishdescription: "descriptionEn",
  descriptionenglish: "descriptionEn",
}

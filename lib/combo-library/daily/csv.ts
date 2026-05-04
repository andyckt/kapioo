import {
  normalizeHeader,
  parseImportWorkbook,
  splitArrayCell,
} from "@/lib/combo-library/shared/csv"
import { normalizeComboLibraryInput } from "@/lib/combo-library/shared/normalize"
import {
  dailyComboLibraryBulkImportRowSchema,
  type DailyComboLibraryItemBody,
} from "@/lib/contracts/daily-combo-library"

const ARRAY_COLUMNS = new Set([
  "typeADishes",
  "typeBDishes",
  "dishes",
  "vegetables",
  "tags",
  "allergens",
  "dietaryTags",
])

const CANONICAL_COLUMNS = new Set([
  "name",
  "nameEn",
  "internalName",
  "description",
  "typeADishes",
  "typeBDishes",
  "dishes",
  "mainProtein",
  "carb",
  "vegetables",
  "sauce",
  "calories",
  "proteinGrams",
  "carbsGrams",
  "fatGrams",
  "tags",
  "allergens",
  "dietaryTags",
  "cuisineType",
  "spiceLevel",
  "portionSize",
  "notesForAdmin",
])

const HEADER_ALIASES: Record<string, string> = {
  displayname: "name",
  display_name: "name",
  adminname: "internalName",
  admin_name: "internalName",
  protein: "mainProtein",
  typeadishes: "typeADishes",
  typea_dishes: "typeADishes",
  typebdishes: "typeBDishes",
  typeb_dishes: "typeBDishes",
  proteingrams: "proteinGrams",
  protein_grams: "proteinGrams",
  carbsgrams: "carbsGrams",
  carbs_grams: "carbsGrams",
  fatgrams: "fatGrams",
  fat_grams: "fatGrams",
  dietarytags: "dietaryTags",
  dietary_tags: "dietaryTags",
  cuisinetype: "cuisineType",
  cuisine_type: "cuisineType",
  spicelevel: "spiceLevel",
  spice_level: "spiceLevel",
  portionsize: "portionSize",
  portion_size: "portionSize",
  notesforadmin: "notesForAdmin",
  notes_for_admin: "notesForAdmin",
}

export type DailyComboLibraryImportPreviewRow = {
  rowIndex: number
  status: "valid" | "invalid" | "duplicate"
  data?: DailyComboLibraryItemBody
  errors: string[]
  warnings: string[]
  existingId?: string
}

function normalizeRawRow(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  const warnings: string[] = []
  const unknownColumns: string[] = []

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const key = normalizeHeader(rawKey, HEADER_ALIASES)
    if (!CANONICAL_COLUMNS.has(key)) {
      unknownColumns.push(rawKey)
      return
    }

    normalized[key] = ARRAY_COLUMNS.has(key) ? splitArrayCell(rawValue) : rawValue
  })

  if (
    (!Array.isArray(normalized.typeADishes) || normalized.typeADishes.length === 0) &&
    (!Array.isArray(normalized.typeBDishes) || normalized.typeBDishes.length === 0) &&
    Array.isArray(normalized.dishes) &&
    normalized.dishes.length > 0
  ) {
    normalized.typeADishes = normalized.dishes
    normalized.typeBDishes = normalized.dishes
    warnings.push("Auto-filled both Type A and Type B from legacy dishes column; please review.")
  }

  if (unknownColumns.length > 0) {
    warnings.push(`Ignored unknown columns: ${unknownColumns.join(", ")}`)
  }

  delete normalized.dishes

  return { normalized, warnings }
}

export { parseImportWorkbook, splitArrayCell }

export function coerceDailyImportRow(
  rawRow: Record<string, unknown>,
  rowIndex: number
): DailyComboLibraryImportPreviewRow {
  const { normalized, warnings } = normalizeRawRow(rawRow)
  const parsed = dailyComboLibraryBulkImportRowSchema.safeParse(
    normalizeComboLibraryInput(normalized, "dailyComboLibraryId")
  )

  if (!parsed.success) {
    return {
      rowIndex,
      status: "invalid",
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      warnings,
    }
  }

  return {
    rowIndex,
    status: "valid",
    data: parsed.data,
    errors: [],
    warnings,
  }
}

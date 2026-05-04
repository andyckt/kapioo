import {
  normalizeHeader,
  parseImportWorkbook,
  splitArrayCell,
} from "@/lib/combo-library/shared/csv"
import {
  getArrayCsvColumns,
  getCanonicalCsvColumns,
} from "@/lib/combo-library/shared/fields"
import {
  DAILY_COMBO_LIBRARY_FIELDS,
  DAILY_COMBO_LIBRARY_HEADER_ALIASES,
  DAILY_COMBO_LIBRARY_LEGACY_CSV_COLUMNS,
} from "@/lib/combo-library/daily/fields"
import { normalizeComboLibraryInput } from "@/lib/combo-library/shared/normalize"
import {
  dailyComboLibraryBulkImportRowSchema,
  type DailyComboLibraryItemBody,
} from "@/lib/contracts/daily-combo-library"

const ARRAY_COLUMNS = new Set([
  ...getArrayCsvColumns(DAILY_COMBO_LIBRARY_FIELDS),
  ...DAILY_COMBO_LIBRARY_LEGACY_CSV_COLUMNS,
])
const CANONICAL_COLUMNS = new Set([
  ...getCanonicalCsvColumns(DAILY_COMBO_LIBRARY_FIELDS),
  ...DAILY_COMBO_LIBRARY_LEGACY_CSV_COLUMNS,
])

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
    const key = normalizeHeader(rawKey, DAILY_COMBO_LIBRARY_HEADER_ALIASES)
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
  normalized.name = normalized.internalName

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

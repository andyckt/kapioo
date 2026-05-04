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
  WEEKLY_COMBO_LIBRARY_FIELDS,
  WEEKLY_COMBO_LIBRARY_HEADER_ALIASES,
} from "@/lib/combo-library/weekly/fields"
import { normalizeComboLibraryInput } from "@/lib/combo-library/shared/normalize"
import {
  weeklyComboLibraryBulkImportRowSchema,
  type WeeklyComboLibraryItemBody,
} from "@/lib/contracts/weekly-combo-library"

const ARRAY_COLUMNS = getArrayCsvColumns(WEEKLY_COMBO_LIBRARY_FIELDS)
const CANONICAL_COLUMNS = getCanonicalCsvColumns(WEEKLY_COMBO_LIBRARY_FIELDS)

export type WeeklyComboLibraryImportPreviewRow = {
  rowIndex: number
  status: "valid" | "invalid" | "duplicate"
  data?: WeeklyComboLibraryItemBody
  errors: string[]
  warnings: string[]
  existingId?: string
}

function normalizeRawRow(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  const warnings: string[] = []
  const unknownColumns: string[] = []

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const key = normalizeHeader(rawKey, WEEKLY_COMBO_LIBRARY_HEADER_ALIASES)
    if (!CANONICAL_COLUMNS.has(key)) {
      unknownColumns.push(rawKey)
      return
    }

    normalized[key] = ARRAY_COLUMNS.has(key) ? splitArrayCell(rawValue) : rawValue
  })

  if (unknownColumns.length > 0) {
    warnings.push(`Ignored unknown columns: ${unknownColumns.join(", ")}`)
  }

  normalized.name = normalized.name || normalized.internalName

  return { normalized, warnings }
}

export { parseImportWorkbook, splitArrayCell }

export function coerceWeeklyImportRow(
  rawRow: Record<string, unknown>,
  rowIndex: number
): WeeklyComboLibraryImportPreviewRow {
  const { normalized, warnings } = normalizeRawRow(rawRow)
  const parsed = weeklyComboLibraryBulkImportRowSchema.safeParse(
    normalizeComboLibraryInput(normalized, "weeklyComboLibraryId")
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

import {
  normalizeHeader,
  parseImportWorkbook,
  splitArrayCell,
} from "@/lib/combo-library/shared/csv"
import { normalizeComboLibraryInput } from "@/lib/combo-library/shared/normalize"
import {
  weeklyComboLibraryBulkImportRowSchema,
  type WeeklyComboLibraryItemBody,
} from "@/lib/contracts/weekly-combo-library"

const ARRAY_COLUMNS = new Set(["dishes", "tags", "allergens", "dietaryTags"])

const CANONICAL_COLUMNS = new Set([
  "name",
  "nameEn",
  "internalName",
  "description",
  "dishes",
  "calories",
  "tags",
  "allergens",
  "dietaryTags",
  "notesForAdmin",
])

const HEADER_ALIASES: Record<string, string> = {
  displayname: "name",
  display_name: "name",
  adminname: "internalName",
  admin_name: "internalName",
  dietarytags: "dietaryTags",
  dietary_tags: "dietaryTags",
  notesforadmin: "notesForAdmin",
  notes_for_admin: "notesForAdmin",
}

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
    const key = normalizeHeader(rawKey, HEADER_ALIASES)
    if (!CANONICAL_COLUMNS.has(key)) {
      unknownColumns.push(rawKey)
      return
    }

    normalized[key] = ARRAY_COLUMNS.has(key) ? splitArrayCell(rawValue) : rawValue
  })

  if (unknownColumns.length > 0) {
    warnings.push(`Ignored unknown columns: ${unknownColumns.join(", ")}`)
  }

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

import * as XLSX from "xlsx"

import {
  COMBO_LIBRARY_IMPORT_MAX_BYTES,
  COMBO_LIBRARY_IMPORT_MAX_ROWS,
} from "@/lib/combo-library/shared/constants"

export function splitArrayCell(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((value) => value.trim()).filter(Boolean)
  }

  const text = String(input ?? "").trim()
  if (!text) {
    return []
  }

  const delimiter = text.includes(";") ? ";" : ","
  return text
    .split(delimiter)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function parseImportWorkbook(buffer: Buffer, filename = "combos.csv") {
  if (buffer.byteLength > COMBO_LIBRARY_IMPORT_MAX_BYTES) {
    throw new Error("Import file is too large. Please upload a file under 10MB.")
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
  })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error("Import file is empty.")
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
  })

  if (rows.length === 0) {
    throw new Error(`${filename} does not contain any data rows.`)
  }

  if (rows.length > COMBO_LIBRARY_IMPORT_MAX_ROWS) {
    throw new Error(`Import supports up to ${COMBO_LIBRARY_IMPORT_MAX_ROWS} rows at a time.`)
  }

  return rows
}

export function normalizeHeader(header: string, aliases: Record<string, string>) {
  const compact = header.trim().replace(/\s+/g, "").toLocaleLowerCase("en-US")
  return aliases[compact] ?? header.trim()
}

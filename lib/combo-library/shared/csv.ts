import * as XLSX from "xlsx"

import {
  COMBO_LIBRARY_IMPORT_MAX_BYTES,
  COMBO_LIBRARY_IMPORT_MAX_ROWS,
} from "@/lib/combo-library/shared/constants"

const MOJIBAKE_MARKER_REGEX = /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/
const CJK_REGEX = /[\u3400-\u9fff]/

function countMatches(input: string, regex: RegExp) {
  return Array.from(input).filter((char) => regex.test(char)).length
}

export function repairMojibakeText(input: string) {
  if (!MOJIBAKE_MARKER_REGEX.test(input)) {
    return input
  }

  const repaired = Buffer.from(input, "latin1").toString("utf8")
  if (repaired.includes("\uFFFD")) {
    return input
  }

  const originalCjk = countMatches(input, CJK_REGEX)
  const repairedCjk = countMatches(repaired, CJK_REGEX)
  const originalMarkers = countMatches(input, MOJIBAKE_MARKER_REGEX)
  const repairedMarkers = countMatches(repaired, MOJIBAKE_MARKER_REGEX)

  if (repairedCjk > originalCjk || repairedMarkers < originalMarkers) {
    return repaired
  }

  return input
}

export function splitArrayCell(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map(repairMojibakeText).map((value) => value.trim()).filter(Boolean)
  }

  const text = repairMojibakeText(String(input ?? "")).trim()
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
  const trimmed = header.trim()
  const withoutOptionalMarker = trimmed.replace(/\s*\(optional\)\s*$/i, "")
  const compact = withoutOptionalMarker.replace(/\s+/g, "").toLocaleLowerCase("en-US")
  return aliases[compact] ?? withoutOptionalMarker
}

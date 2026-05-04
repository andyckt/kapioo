import { errorJson, handleRouteError, successJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { coerceWeeklyImportRow, parseImportWorkbook } from "@/lib/combo-library/weekly/csv"
import connectToDatabase from "@/lib/db"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return errorJson("No import file provided", 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawRows = parseImportWorkbook(buffer, file.name)
    const rows = rawRows.map((row, index) => coerceWeeklyImportRow(row, index + 2))

    await connectToDatabase()

    const validRows = rows.filter((row) => row.status === "valid" && row.data)
    const internalNames = validRows.map((row) => row.data!.internalName)

    const existingItems = await WeeklyComboLibraryItem.find({
      internalName: { $in: internalNames },
    })
      .select("weeklyComboLibraryId name internalName")
      .lean()

    const existingByInternalName = new Map(
      existingItems
        .filter((item) => typeof item.internalName === "string" && item.internalName)
        .map((item) => [String(item.internalName), item])
    )
    const seenNames = new Set<string>()

    const annotatedRows = rows.map((row) => {
      if (row.status !== "valid" || !row.data) return row

      const existing =
        existingByInternalName.get(row.data.internalName)
      const normalizedName = row.data.internalName.toLocaleLowerCase("en-US")
      const duplicateInFile = seenNames.has(normalizedName)
      seenNames.add(normalizedName)

      if (existing || duplicateInFile) {
        return {
          ...row,
          status: "duplicate" as const,
          existingId: existing ? String(existing.weeklyComboLibraryId) : undefined,
          warnings: [
            ...row.warnings,
            duplicateInFile
              ? "Duplicate internalName appears earlier in this import file."
              : "Duplicate internalName already exists in the Weekly library.",
          ],
        }
      }

      return row
    })

    return successJson({
      rows: annotatedRows,
      summary: {
        totalRows: annotatedRows.length,
        valid: annotatedRows.filter((row) => row.status === "valid").length,
        invalid: annotatedRows.filter((row) => row.status === "invalid").length,
        duplicates: annotatedRows.filter((row) => row.status === "duplicate").length,
      },
    })
  } catch (error: unknown) {
    return handleRouteError(error, "POST /api/admin/weekly-combo-library/bulk-import/preview")
  }
}

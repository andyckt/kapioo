import { errorJson, handleRouteError, successJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { coerceDailyImportRow, parseImportWorkbook } from "@/lib/combo-library/daily/csv"
import connectToDatabase from "@/lib/db"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return errorJson("No import file provided", 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawRows = parseImportWorkbook(buffer, file.name)
    const rows = rawRows.map((row, index) => coerceDailyImportRow(row, index + 2))

    await connectToDatabase()

    const validRows = rows.filter((row) => row.status === "valid" && row.data)
    const names = validRows.map((row) => row.data!.name)
    const internalNames = validRows
      .map((row) => row.data!.internalName)
      .filter(Boolean) as string[]

    const existingItems = await DailyComboLibraryItem.find({
      $or: [
        ...(names.length > 0 ? [{ name: { $in: names } }] : []),
        ...(internalNames.length > 0 ? [{ internalName: { $in: internalNames } }] : []),
      ],
    })
      .select("dailyComboLibraryId name internalName")
      .lean()

    const existingByName = new Map(existingItems.map((item) => [String(item.name), item]))
    const existingByInternalName = new Map(
      existingItems
        .filter((item) => typeof item.internalName === "string" && item.internalName)
        .map((item) => [String(item.internalName), item])
    )
    const seenNames = new Set<string>()

    const annotatedRows = rows.map((row) => {
      if (row.status !== "valid" || !row.data) return row

      const existing =
        existingByName.get(row.data.name) ||
        (row.data.internalName ? existingByInternalName.get(row.data.internalName) : undefined)
      const normalizedName = row.data.name.toLocaleLowerCase("en-US")
      const duplicateInFile = seenNames.has(normalizedName)
      seenNames.add(normalizedName)

      if (existing || duplicateInFile) {
        return {
          ...row,
          status: "duplicate" as const,
          existingId: existing ? String(existing.dailyComboLibraryId) : undefined,
          warnings: [
            ...row.warnings,
            duplicateInFile
              ? "Duplicate name appears earlier in this import file."
              : "Duplicate name or internalName already exists in the Daily library.",
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
    return handleRouteError(error, "POST /api/admin/daily-combo-library/bulk-import/preview")
  }
}

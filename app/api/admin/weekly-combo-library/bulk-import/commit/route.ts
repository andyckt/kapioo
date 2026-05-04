import { handleRouteError, parseJsonBody, successJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import {
  buildComboLibraryIdCandidates,
  normalizeComboLibraryInput,
} from "@/lib/combo-library/shared/normalize"
import { weeklyComboLibraryBulkImportCommitSchema } from "@/lib/contracts/weekly-combo-library"
import connectToDatabase from "@/lib/db"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"

async function resolveUniqueComboLibraryId(baseName: string, requested?: string) {
  const candidates = requested?.trim()
    ? [requested.trim(), ...buildComboLibraryIdCandidates(requested.trim())]
    : buildComboLibraryIdCandidates(baseName)

  for (const candidate of candidates) {
    const exists = await WeeklyComboLibraryItem.exists({ weeklyComboLibraryId: candidate })
    if (!exists) return candidate
  }

  return `${candidates[0]}-${Date.now()}`
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const { data, error } = await parseJsonBody(request, weeklyComboLibraryBulkImportCommitSchema)
    if (error) return error

    await connectToDatabase()

    const operations: Parameters<typeof WeeklyComboLibraryItem.bulkWrite>[0] = []
    const skipped: Array<{ name: string; reason: string }> = []
    const failed: Array<{ name: string; error: string }> = []

    for (const row of data.rows) {
      try {
        const normalized = normalizeComboLibraryInput(row, "weeklyComboLibraryId")
        const existing = (await WeeklyComboLibraryItem.findOne({
          $or: [
            { name: normalized.name },
            ...(normalized.internalName ? [{ internalName: normalized.internalName }] : []),
          ],
        })
          .select("_id")
          .lean()) as { _id: unknown } | null

        if (existing && data.duplicatePolicy === "skip") {
          skipped.push({ name: normalized.name, reason: "duplicate" })
          continue
        }

        if (existing && data.duplicatePolicy === "update") {
          const updateFields: Record<string, unknown> = { ...normalized }
          delete updateFields.weeklyComboLibraryId
          operations.push({
            updateOne: {
              filter: { _id: existing._id },
              update: { $set: { ...updateFields, updatedBy: actor.user._id } },
            },
          })
          continue
        }

        const weeklyComboLibraryId = await resolveUniqueComboLibraryId(
          normalized.name,
          normalized.weeklyComboLibraryId
        )
        operations.push({
          insertOne: {
            document: {
              ...normalized,
              weeklyComboLibraryId,
              createdBy: actor.user._id,
              updatedBy: actor.user._id,
            },
          },
        })
      } catch (rowError: unknown) {
        failed.push({
          name: row.name,
          error: rowError instanceof Error ? rowError.message : "Unknown row error",
        })
      }
    }

    const result =
      operations.length > 0
        ? await WeeklyComboLibraryItem.bulkWrite(operations, { ordered: false })
        : null

    return successJson({
      created: result?.insertedCount ?? 0,
      updated: result?.modifiedCount ?? 0,
      skipped: skipped.length,
      failed,
      skippedRows: skipped,
    })
  } catch (error: unknown) {
    return handleRouteError(error, "POST /api/admin/weekly-combo-library/bulk-import/commit")
  }
}

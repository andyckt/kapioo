import { errorJson, handleRouteError, successJson, type RouteContext } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import {
  buildComboLibraryIdCandidates,
  slugifyComboLibraryId,
} from "@/lib/combo-library/shared/normalize"
import connectToDatabase from "@/lib/db"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"

async function createDuplicate(original: Record<string, unknown>, actorId: unknown) {
  const baseName = `${String(original.name || "Combo")} (Copy)`
  const baseSlug = `${slugifyComboLibraryId(
    String(original.dailyComboLibraryId || original.name || "combo")
  )}-copy`
  const candidates = [baseSlug, ...Array.from({ length: 4 }, (_, index) => `${baseSlug}-${index + 2}`)]

  let lastError: unknown
  for (const dailyComboLibraryId of candidates.length > 0 ? candidates : buildComboLibraryIdCandidates(baseName)) {
    try {
      return await DailyComboLibraryItem.create({
        ...original,
        _id: undefined,
        dailyComboLibraryId,
        name: baseName,
        status: "draft",
        imageUrl: undefined,
        imageKey: undefined,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: undefined,
        updatedAt: undefined,
      })
    } catch (error: unknown) {
      lastError = error
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        continue
      }
      throw error
    }
  }

  throw lastError
}

export async function POST(
  request: Request,
  { params }: RouteContext<{ dailyComboLibraryId: string }>
) {
  let dailyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ dailyComboLibraryId } = await params)
    await connectToDatabase()

    const original = await DailyComboLibraryItem.findOne({ dailyComboLibraryId }).lean()
    if (!original) return errorJson("Daily combo library item not found", 404)

    const duplicate = await createDuplicate(original as Record<string, unknown>, actor.user._id)
    return successJson(duplicate, 201)
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `POST /api/admin/daily-combo-library/${dailyComboLibraryId || "[dailyComboLibraryId]"}/duplicate`
    )
  }
}

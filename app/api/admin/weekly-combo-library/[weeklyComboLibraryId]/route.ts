import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { normalizeComboLibraryPatch } from "@/lib/combo-library/shared/normalize"
import { weeklyComboLibraryItemUpdateSchema } from "@/lib/contracts/weekly-combo-library"
import connectToDatabase from "@/lib/db"
import { deleteMenuImageFromS3 } from "@/lib/upload/menu-image"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"
import WeeklyMealOption from "@/models/WeeklyMealOption"

export async function GET(
  request: Request,
  { params }: RouteContext<{ weeklyComboLibraryId: string }>
) {
  let weeklyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ weeklyComboLibraryId } = await params)
    await connectToDatabase()

    const item = await WeeklyComboLibraryItem.findOne({ weeklyComboLibraryId }).lean()
    if (!item) return errorJson("Weekly combo library item not found", 404)

    return successJson(item)
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `GET /api/admin/weekly-combo-library/${weeklyComboLibraryId || "[weeklyComboLibraryId]"}`
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<{ weeklyComboLibraryId: string }>
) {
  let weeklyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ weeklyComboLibraryId } = await params)
    const { data, error } = await parseJsonBody(request, weeklyComboLibraryItemUpdateSchema)
    if (error) return error

    await connectToDatabase()

    const existing = (await WeeklyComboLibraryItem.findOne({ weeklyComboLibraryId }).lean()) as
      | { imageKey?: unknown }
      | null
    if (!existing) return errorJson("Weekly combo library item not found", 404)

    const normalized = normalizeComboLibraryPatch(data)
    const updateData = { ...normalized, updatedBy: actor.user._id } as Record<string, unknown>

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") delete updateData[key]
    })

    const shouldRemoveImage =
      Object.prototype.hasOwnProperty.call(data, "imageUrl") && data.imageUrl === ""
    const previousImageKey =
      typeof existing.imageKey === "string" && existing.imageKey ? existing.imageKey : undefined
    const nextImageKey =
      typeof data.imageKey === "string" && data.imageKey ? data.imageKey : undefined

    const unsetData: Record<string, 1> = {}
    if (shouldRemoveImage) {
      delete updateData.imageUrl
      delete updateData.imageKey
      unsetData.imageUrl = 1
      unsetData.imageKey = 1
    }

    const updateOperation =
      Object.keys(unsetData).length > 0
        ? {
            ...(Object.keys(updateData).length > 0 ? { $set: updateData } : {}),
            $unset: unsetData,
          }
        : { $set: updateData }

    const item = await WeeklyComboLibraryItem.findOneAndUpdate(
      { weeklyComboLibraryId },
      updateOperation,
      { new: true, runValidators: true }
    )

    if (shouldRemoveImage) {
      void deleteMenuImageFromS3(previousImageKey)
    } else if (previousImageKey && nextImageKey && previousImageKey !== nextImageKey) {
      void deleteMenuImageFromS3(previousImageKey)
    }

    return successJson(item)
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `PATCH /api/admin/weekly-combo-library/${weeklyComboLibraryId || "[weeklyComboLibraryId]"}`
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<{ weeklyComboLibraryId: string }>
) {
  let weeklyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ weeklyComboLibraryId } = await params)
    await connectToDatabase()

    const reference = await WeeklyMealOption.exists({ sourceComboLibraryId: weeklyComboLibraryId })
    if (reference) {
      return errorJson("This combo is already used by a Weekly menu. Archive it instead.", 409)
    }

    const item = await WeeklyComboLibraryItem.findOneAndDelete({ weeklyComboLibraryId })
    if (!item) return errorJson("Weekly combo library item not found", 404)

    if (typeof item.imageKey === "string") void deleteMenuImageFromS3(item.imageKey)

    return successJson({})
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `DELETE /api/admin/weekly-combo-library/${weeklyComboLibraryId || "[weeklyComboLibraryId]"}`
    )
  }
}

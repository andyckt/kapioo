import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { normalizeComboLibraryPatch } from "@/lib/combo-library/shared/normalize"
import { dailyComboLibraryItemUpdateSchema } from "@/lib/contracts/daily-combo-library"
import connectToDatabase from "@/lib/db"
import { deleteMenuImageFromS3 } from "@/lib/upload/menu-image"
import Combo from "@/models/Combo"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"

export async function GET(
  request: Request,
  { params }: RouteContext<{ dailyComboLibraryId: string }>
) {
  let dailyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ dailyComboLibraryId } = await params)
    await connectToDatabase()

    const item = await DailyComboLibraryItem.findOne({ dailyComboLibraryId }).lean()
    if (!item) return errorJson("Daily combo library item not found", 404)

    return successJson(item)
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `GET /api/admin/daily-combo-library/${dailyComboLibraryId || "[dailyComboLibraryId]"}`
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<{ dailyComboLibraryId: string }>
) {
  let dailyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ dailyComboLibraryId } = await params)
    const { data, error } = await parseJsonBody(request, dailyComboLibraryItemUpdateSchema)
    if (error) return error

    await connectToDatabase()

    const existing = (await DailyComboLibraryItem.findOne({ dailyComboLibraryId }).lean()) as
      | { imageKey?: unknown }
      | null
    if (!existing) return errorJson("Daily combo library item not found", 404)

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

    const item = await DailyComboLibraryItem.findOneAndUpdate(
      { dailyComboLibraryId },
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
      `PATCH /api/admin/daily-combo-library/${dailyComboLibraryId || "[dailyComboLibraryId]"}`
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<{ dailyComboLibraryId: string }>
) {
  let dailyComboLibraryId = ""
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    ;({ dailyComboLibraryId } = await params)
    await connectToDatabase()

    const reference = await Combo.exists({ sourceComboLibraryId: dailyComboLibraryId })
    if (reference) {
      return errorJson("This combo is already used by a Daily menu. Archive it instead.", 409)
    }

    const item = await DailyComboLibraryItem.findOneAndDelete({ dailyComboLibraryId })
    if (!item) return errorJson("Daily combo library item not found", 404)

    if (typeof item.imageKey === "string") void deleteMenuImageFromS3(item.imageKey)

    return successJson({})
  } catch (error: unknown) {
    return handleRouteError(
      error,
      `DELETE /api/admin/daily-combo-library/${dailyComboLibraryId || "[dailyComboLibraryId]"}`
    )
  }
}

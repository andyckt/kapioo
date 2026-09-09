import {
  errorJson,
  handleRouteError,
  parseJsonBody,
  successJson,
  type RouteContext,
} from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import { adminDailyDeliveryMinimumBodySchema } from "@/lib/contracts/user"
import connectToDatabase from "@/lib/db"
import { getTorontoDateKey, isValidDateKey } from "@/lib/orders/daily-delivery-minimum"
import { logAuditEvent } from "@/lib/security/audit"
import User from "@/models/User"

function serializeOverride(value: {
  minimumMeals?: number
  startsOn?: string
  endsOn?: string
} | null | undefined) {
  if (!value) return null
  return {
    minimumMeals: value.minimumMeals,
    startsOn: value.startsOn,
    endsOn: value.endsOn,
  }
}

export async function PATCH(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = ""

  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) {
      return response
    }

    ({ id } = await params)
    const { data, error } = await parseJsonBody(request, adminDailyDeliveryMinimumBodySchema)
    if (error) return error

    await connectToDatabase()

    const user = await User.findById(id)
    if (!user) return errorJson("User not found", 404)

    const previousOverride = serializeOverride(user.dailyDeliveryMinimumOverride)

    if (!data.enabled) {
      user.set("dailyDeliveryMinimumOverride", undefined)
    } else {
      if (!isValidDateKey(data.startsOn) || !isValidDateKey(data.endsOn)) {
        return errorJson("Enter valid start and end dates", 400)
      }
      if (data.startsOn > data.endsOn) {
        return errorJson("End date must be on or after the start date", 400)
      }
      if (data.endsOn < getTorontoDateKey()) {
        return errorJson("End date cannot be in the past", 400)
      }

      user.set("dailyDeliveryMinimumOverride", {
        minimumMeals: 1,
        startsOn: data.startsOn,
        endsOn: data.endsOn,
      })
    }

    await user.save()

    const nextOverride = serializeOverride(user.dailyDeliveryMinimumOverride)

    await logAuditEvent({
      actor,
      action: data.enabled
        ? "user.daily-delivery-minimum.enable"
        : "user.daily-delivery-minimum.disable",
      targetType: "user",
      targetId: String(user._id),
      request,
      metadata: {
        customerEmail: user.email,
        previousOverride,
        nextOverride,
      },
    })

    return successJson({ dailyDeliveryMinimumOverride: nextOverride })
  } catch (error: unknown) {
    return handleRouteError(error, `PATCH /api/admin/users/${id || "[id]"}/daily-delivery-minimum`)
  }
}

import { randomUUID } from "crypto"

import { handleRouteError, parseJsonBody, parseSearchParams, successJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import {
  buildComboLibraryIdCandidates,
  normalizeComboLibraryInput,
} from "@/lib/combo-library/shared/normalize"
import {
  dailyComboLibraryItemBodySchema,
  dailyComboLibraryListQuerySchema,
} from "@/lib/contracts/daily-combo-library"
import connectToDatabase from "@/lib/db"
import { rewriteS3UrlToCloudFront } from "@/lib/upload/menu-image"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function splitQueryList(input?: string) {
  return input
    ? input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
}

function buildListFilter(query: ReturnType<typeof dailyComboLibraryListQuerySchema.parse>) {
  const filter: Record<string, unknown> = {}

  const tags = splitQueryList(query.tags)
  if (tags.length > 0) filter.tags = { $all: tags }

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q), $options: "i" }
    filter.$or = [
      { name: regex },
      { internalName: regex },
      { tags: regex },
      { tagsEn: regex },
      { allergensZh: regex },
      { allergensEn: regex },
      { descriptionZh: regex },
      { descriptionEn: regex },
      { typeADishes: regex },
      { typeADishesEn: regex },
      { typeBDishes: regex },
      { typeBDishesEn: regex },
    ]
  }

  return filter
}

function buildSort(sort: string): Record<string, 1 | -1> {
  switch (sort) {
    case "created-desc":
      return { createdAt: -1 }
    case "name-asc":
      return { name: 1 }
    case "calories-asc":
      return { calories: 1 }
    case "calories-desc":
      return { calories: -1 }
    default:
      return { updatedAt: -1 }
  }
}

async function createWithGeneratedId(input: Record<string, unknown>, actorId?: unknown) {
  const suppliedId =
    typeof input.dailyComboLibraryId === "string" && input.dailyComboLibraryId.trim()
      ? [input.dailyComboLibraryId.trim()]
      : buildComboLibraryIdCandidates(String(input.name || "combo"))
  const candidates = [...suppliedId, `combo-${randomUUID().slice(0, 8)}`]
  let lastError: unknown

  for (const dailyComboLibraryId of candidates) {
    try {
      return await DailyComboLibraryItem.create({
        ...input,
        dailyComboLibraryId,
        createdBy: actorId,
        updatedBy: actorId,
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

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const parsed = parseSearchParams(request, dailyComboLibraryListQuerySchema)
    if (parsed.error) return parsed.error

    await connectToDatabase()

    const filter = buildListFilter(parsed.data)
    const skip = (parsed.data.page - 1) * parsed.data.limit
    const [items, total] = await Promise.all([
      DailyComboLibraryItem.find(filter)
        .sort(buildSort(parsed.data.sort))
        .skip(skip)
        .limit(parsed.data.limit)
        .lean(),
      DailyComboLibraryItem.countDocuments(filter),
    ])

    return successJson({
      items: items.map((item) => ({
        ...item,
        imageUrl: rewriteS3UrlToCloudFront(item.imageUrl as string),
      })),
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    })
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/daily-combo-library")
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const { data, error } = await parseJsonBody(request, dailyComboLibraryItemBodySchema)
    if (error) return error

    await connectToDatabase()

    const normalized = normalizeComboLibraryInput(data, "dailyComboLibraryId")
    normalized.name = normalized.internalName
    const item = await createWithGeneratedId(normalized, actor.user._id)

    return successJson(item, 201)
  } catch (error: unknown) {
    return handleRouteError(error, "POST /api/admin/daily-combo-library")
  }
}

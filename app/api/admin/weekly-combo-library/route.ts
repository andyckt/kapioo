import { randomUUID } from "crypto"

import { handleRouteError, parseJsonBody, parseSearchParams, successJson } from "@/lib/api"
import { requireAdminMfa } from "@/lib/auth/guards"
import {
  buildComboLibraryIdCandidates,
  normalizeComboLibraryInput,
} from "@/lib/combo-library/shared/normalize"
import {
  weeklyComboLibraryItemBodySchema,
  weeklyComboLibraryListQuerySchema,
} from "@/lib/contracts/weekly-combo-library"
import connectToDatabase from "@/lib/db"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"

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

function buildListFilter(query: ReturnType<typeof weeklyComboLibraryListQuerySchema.parse>) {
  const filter: Record<string, unknown> = {}

  if (query.status) filter.status = query.status

  const tags = splitQueryList(query.tags)
  if (tags.length > 0) filter.tags = { $all: tags }

  const allergens = splitQueryList(query.allergens)
  if (allergens.length > 0) filter.allergens = { $all: allergens }

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q), $options: "i" }
    filter.$or = [
      { name: regex },
      { nameEn: regex },
      { internalName: regex },
      { tags: regex },
      { description: regex },
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
    typeof input.weeklyComboLibraryId === "string" && input.weeklyComboLibraryId.trim()
      ? [input.weeklyComboLibraryId.trim()]
      : buildComboLibraryIdCandidates(String(input.internalName || input.name || "combo"))
  const candidates = [...suppliedId, `combo-${randomUUID().slice(0, 8)}`]
  let lastError: unknown

  for (const weeklyComboLibraryId of candidates) {
    try {
      return await WeeklyComboLibraryItem.create({
        ...input,
        weeklyComboLibraryId,
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

    const parsed = parseSearchParams(request, weeklyComboLibraryListQuerySchema)
    if (parsed.error) return parsed.error

    await connectToDatabase()

    const filter = buildListFilter(parsed.data)
    const skip = (parsed.data.page - 1) * parsed.data.limit
    const [items, total] = await Promise.all([
      WeeklyComboLibraryItem.find(filter)
        .select("-dishes")
        .sort(buildSort(parsed.data.sort))
        .skip(skip)
        .limit(parsed.data.limit)
        .lean(),
      WeeklyComboLibraryItem.countDocuments(filter),
    ])

    return successJson({
      items,
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    })
  } catch (error: unknown) {
    return handleRouteError(error, "GET /api/admin/weekly-combo-library")
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request)
    if (!actor || response) return response

    const { data, error } = await parseJsonBody(request, weeklyComboLibraryItemBodySchema)
    if (error) return error

    await connectToDatabase()

    const normalized = normalizeComboLibraryInput(data, "weeklyComboLibraryId")
    normalized.name = normalized.name || normalized.internalName
    const item = await createWithGeneratedId(normalized, actor.user._id)

    return successJson(item, 201)
  } catch (error: unknown) {
    return handleRouteError(error, "POST /api/admin/weekly-combo-library")
  }
}

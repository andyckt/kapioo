import { randomUUID } from "crypto"

import { repairMojibakeText } from "@/lib/combo-library/shared/csv"

const ASCII_WORD_REGEX = /[^a-z0-9]+/g

export function normalizeText(value: unknown) {
  return typeof value === "string" ? repairMojibakeText(value).trim() : ""
}

export function normalizeArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const seen = new Set<string>()
  const normalized: string[] = []

  values.forEach((value) => {
    const text = normalizeText(value)
    if (!text) {
      return
    }

    const key = text.toLocaleLowerCase("en-US")
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    normalized.push(text)
  })

  return normalized
}

export function normalizeOptionalString(value: unknown) {
  const text = normalizeText(value)
  return text || undefined
}

export function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

export function normalizeComboLibraryInput<T extends Record<string, unknown>>(
  input: T,
  idField: "dailyComboLibraryId" | "weeklyComboLibraryId"
) {
  return {
    ...input,
    [idField]: normalizeText(input[idField]),
    name: normalizeText(input.name),
    nameEn: normalizeOptionalString(input.nameEn),
    internalName: normalizeOptionalString(input.internalName),
    description: normalizeOptionalString(input.description),
    typeADishes: normalizeArray(input.typeADishes),
    typeADishesEn: normalizeArray(input.typeADishesEn),
    typeBDishes: normalizeArray(input.typeBDishes),
    typeBDishesEn: normalizeArray(input.typeBDishesEn),
    dishes: normalizeArray(input.dishes),
    vegetables: normalizeArray(input.vegetables),
    tags: normalizeArray(input.tags),
    tagsEn: normalizeArray(input.tagsEn),
    allergens: normalizeArray(input.allergens),
    allergensZh: normalizeArray(input.allergensZh),
    allergensEn: normalizeArray(input.allergensEn),
    dietaryTags: normalizeArray(input.dietaryTags),
    proteinGrams: normalizeOptionalNumber(input.proteinGrams ?? input.protein),
    descriptionZh: normalizeOptionalString(input.descriptionZh),
    descriptionEn: normalizeOptionalString(input.descriptionEn),
    mainProtein: normalizeOptionalString(input.mainProtein),
    carb: normalizeOptionalString(input.carb),
    sauce: normalizeOptionalString(input.sauce),
    cuisineType: normalizeOptionalString(input.cuisineType),
    portionSize: normalizeOptionalString(input.portionSize),
    notesForAdmin: normalizeOptionalString(input.notesForAdmin),
    imageUrl: normalizeOptionalString(input.imageUrl),
    imageKey: normalizeOptionalString(input.imageKey),
  }
}

export function normalizeComboLibraryPatch(input: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }

    if (
      [
        "typeADishes",
        "typeADishesEn",
        "typeBDishes",
        "typeBDishesEn",
        "dishes",
        "vegetables",
        "tags",
        "tagsEn",
        "allergens",
        "allergensZh",
        "allergensEn",
        "dietaryTags",
      ].includes(key)
    ) {
      normalized[key] = normalizeArray(value)
      return
    }

    if (
      [
        "dailyComboLibraryId",
        "weeklyComboLibraryId",
        "name",
        "nameEn",
        "internalName",
        "description",
        "descriptionZh",
        "descriptionEn",
        "mainProtein",
        "carb",
        "sauce",
        "cuisineType",
        "portionSize",
        "notesForAdmin",
        "imageUrl",
        "imageKey",
      ].includes(key)
    ) {
      normalized[key] = normalizeOptionalString(value)
      return
    }

    if (key === "proteinGrams" || key === "protein") {
      normalized.proteinGrams = normalizeOptionalNumber(value)
      return
    }

    normalized[key] = value
  })

  return normalized
}

export function slugifyComboLibraryId(name: string) {
  const asciiSlug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(ASCII_WORD_REGEX, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return asciiSlug || `combo-${randomUUID().slice(0, 8)}`
}

export function buildComboLibraryIdCandidates(baseName: string) {
  const base = slugifyComboLibraryId(baseName)
  return [base, ...Array.from({ length: 4 }, (_, index) => `${base}-${index + 2}`)]
}

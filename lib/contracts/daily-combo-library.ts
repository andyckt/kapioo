import { z } from "zod"

import { paginationQuerySchema } from "@/lib/contracts/common"
import {
  comboLibrarySortSchema,
  compactStringArraySchema,
  optionalTrimmedString,
  spiceLevelSchema,
  statusSchema,
  stringArraySchema,
} from "@/lib/combo-library/shared/zod-helpers"

export const dailyComboLibraryItemBodySchema = z.object({
  dailyComboLibraryId: optionalTrimmedString(120),
  name: z.string().trim().min(1).max(200),
  nameEn: optionalTrimmedString(200),
  internalName: optionalTrimmedString(200),
  description: optionalTrimmedString(2000),
  typeADishes: stringArraySchema.refine((items) => items.length > 0, "Type A dishes are required"),
  typeBDishes: stringArraySchema.refine((items) => items.length > 0, "Type B dishes are required"),
  mainProtein: optionalTrimmedString(120),
  carb: optionalTrimmedString(120),
  vegetables: compactStringArraySchema,
  sauce: optionalTrimmedString(120),
  imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
  imageKey: z.string().max(512).optional().or(z.literal("")),
  calories: z.coerce.number().nonnegative().max(10000),
  proteinGrams: z.coerce.number().nonnegative().max(1000).optional(),
  carbsGrams: z.coerce.number().nonnegative().max(1000).optional(),
  fatGrams: z.coerce.number().nonnegative().max(1000).optional(),
  tags: compactStringArraySchema,
  allergens: compactStringArraySchema,
  dietaryTags: compactStringArraySchema,
  cuisineType: optionalTrimmedString(120),
  spiceLevel: spiceLevelSchema.optional(),
  portionSize: optionalTrimmedString(120),
  status: statusSchema.default("active"),
  notesForAdmin: optionalTrimmedString(2000),
})

export const dailyComboLibraryItemUpdateSchema = dailyComboLibraryItemBodySchema.partial()

export const dailyComboLibraryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
  protein: z.string().trim().max(120).optional(),
  tags: z.string().trim().max(500).optional(),
  allergens: z.string().trim().max(500).optional(),
  cuisine: z.string().trim().max(120).optional(),
  spice: spiceLevelSchema.optional(),
  sort: comboLibrarySortSchema,
})

export const dailyComboLibraryBulkImportRowSchema = dailyComboLibraryItemBodySchema
  .extend({
    rowIndex: z.number().int().positive().optional(),
  })
  .passthrough()

export const dailyComboLibraryBulkImportCommitSchema = z.object({
  rows: z.array(dailyComboLibraryItemBodySchema).min(1).max(1000),
  duplicatePolicy: z.enum(["skip", "create", "update"]).default("skip"),
})

export type DailyComboLibraryItemBody = z.infer<typeof dailyComboLibraryItemBodySchema>
export type DailyComboLibraryItemUpdate = z.infer<typeof dailyComboLibraryItemUpdateSchema>
export type DailyComboLibraryListQuery = z.infer<typeof dailyComboLibraryListQuerySchema>
export type DailyComboLibraryBulkImportCommit = z.infer<typeof dailyComboLibraryBulkImportCommitSchema>

import { z } from "zod"

import { paginationQuerySchema } from "@/lib/contracts/common"
import {
  comboLibrarySortSchema,
  compactStringArraySchema,
  optionalTrimmedString,
  statusSchema,
  stringArraySchema,
} from "@/lib/combo-library/shared/zod-helpers"

export const weeklyComboLibraryItemBodySchema = z.object({
  weeklyComboLibraryId: optionalTrimmedString(120),
  name: z.string().trim().min(1).max(200),
  nameEn: optionalTrimmedString(200),
  internalName: optionalTrimmedString(200),
  description: optionalTrimmedString(2000),
  dishes: stringArraySchema,
  imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
  imageKey: z.string().max(512).optional().or(z.literal("")),
  calories: z.coerce.number().nonnegative().max(10000).optional(),
  tags: compactStringArraySchema,
  allergens: compactStringArraySchema,
  dietaryTags: compactStringArraySchema,
  status: statusSchema.default("active"),
  notesForAdmin: optionalTrimmedString(2000),
})

export const weeklyComboLibraryItemUpdateSchema = weeklyComboLibraryItemBodySchema.partial()

export const weeklyComboLibraryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
  tags: z.string().trim().max(500).optional(),
  allergens: z.string().trim().max(500).optional(),
  sort: comboLibrarySortSchema,
})

export const weeklyComboLibraryBulkImportRowSchema = weeklyComboLibraryItemBodySchema
  .extend({
    rowIndex: z.number().int().positive().optional(),
  })
  .passthrough()

export const weeklyComboLibraryBulkImportCommitSchema = z.object({
  rows: z.array(weeklyComboLibraryItemBodySchema).min(1).max(1000),
  duplicatePolicy: z.enum(["skip", "create", "update"]).default("skip"),
})

export type WeeklyComboLibraryItemBody = z.infer<typeof weeklyComboLibraryItemBodySchema>
export type WeeklyComboLibraryItemUpdate = z.infer<typeof weeklyComboLibraryItemUpdateSchema>
export type WeeklyComboLibraryListQuery = z.infer<typeof weeklyComboLibraryListQuerySchema>
export type WeeklyComboLibraryBulkImportCommit = z.infer<typeof weeklyComboLibraryBulkImportCommitSchema>

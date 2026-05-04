import { z } from "zod"

import {
  COMBO_LIBRARY_STATUSES,
  SPICE_LEVELS,
} from "@/lib/combo-library/shared/constants"

export const optionalTrimmedString = (max = 512) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))

export const stringArraySchema = z.array(z.string().trim().min(1).max(200)).max(50).default([])

export const compactStringArraySchema = z.array(z.string().trim().min(1).max(100)).max(30).default([])

export const statusSchema = z.enum(COMBO_LIBRARY_STATUSES)

export const spiceLevelSchema = z.enum(SPICE_LEVELS)

export const comboLibrarySortSchema = z
  .enum(["updated-desc", "created-desc", "name-asc", "calories-asc", "calories-desc"])
  .default("updated-desc")

import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

/** Admin history lists; keep a generous cap (legacy routes had no max). */
const HISTORY_LIST_LIMIT_MAX = 2000;

export const dayHistoryListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(HISTORY_LIST_LIMIT_MAX).default(50),
  skip: z.coerce.number().int().nonnegative().default(0),
  reason: z.string().optional(),
});

export const dayHistoryCreateBodySchema = z
  .object({
    historyId: nonEmptyString,
    originalDayId: nonEmptyString,
    displayName: nonEmptyString,
    date: nonEmptyString,
    week: z.coerce.number(),
    archivedReason: z.enum(["rolled_forward", "manually_deleted"]),
    combos: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const weeklyDeliveryHistoryListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(HISTORY_LIST_LIMIT_MAX).default(50),
  reason: z.string().optional(),
});

export const weeklyDeliveryHistoryCreateBodySchema = z
  .object({
    historyId: nonEmptyString,
    originalDay: z.enum(["sunday", "tuesday"]),
    originalWeekOffset: z.coerce.number(),
    displayName: nonEmptyString,
    date: nonEmptyString,
    archivedReason: z.enum(["rolled_forward", "manually_deleted"]),
    mealOptions: z.array(z.unknown()).optional(),
  })
  .passthrough();

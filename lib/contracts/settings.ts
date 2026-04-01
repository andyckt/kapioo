import { z } from "zod";

import { nonEmptyString } from "@/lib/contracts/common";

export const cutoffTimeValueSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export const settingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  cutoffTimeValueSchema,
  z.array(z.unknown()),
  z.record(z.unknown()),
  z.null(),
]);

export const settingRecordSchema = z.object({
  _id: z.string().optional(),
  key: nonEmptyString,
  value: settingValueSchema,
  description: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SettingRecord = z.infer<typeof settingRecordSchema>;

export const updateSettingBodySchema = z.object({
  key: nonEmptyString,
  value: settingValueSchema,
  description: z.string().optional(),
});

export type UpdateSettingBody = z.infer<typeof updateSettingBodySchema>;

export const maintenanceModeBodySchema = z.object({
  isMaintenanceMode: z.boolean(),
});

export type MaintenanceModeBody = z.infer<typeof maintenanceModeBodySchema>;

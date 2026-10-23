import type { ClientSession } from "mongoose";
import { ApiError } from "@/lib/api/errors";
import { cutoffTimeValueSchema } from "@/lib/contracts/settings";
import Settings from "@/models/Settings";

async function readCutoff(key: "cutoffTime" | "cancellationTime", session?: ClientSession) {
  const setting = await Settings.findOne({ key }).session(session || null).lean<{ value?: unknown }>();
  // Each deadline has its own default. An unset cancellation setting never
  // inherits a customized ordering cutoff.
  const parsed = cutoffTimeValueSchema.safeParse(setting ? setting.value : { hour: 11, minute: 59 });
  if (!parsed.success) {
    throw new ApiError("Change deadline is unavailable. Please contact support.", { status: 503 });
  }
  return parsed.data;
}

/** Address changes retain the ordering cutoff. */
export function getChangeCutoff(session?: ClientSession) {
  return readCutoff("cutoffTime", session);
}

export function getCancellationCutoff(session?: ClientSession) {
  return readCutoff("cancellationTime", session);
}

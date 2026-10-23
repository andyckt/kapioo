import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { SupportRate } from "@/models/Support";

export const GUEST_COOKIE = "kapioo-support-guest";
export const ATTRIBUTION_COOKIE = "kapioo-support-checkout";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 30 * 86400 };

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new ApiError("Invalid request origin", { status: 403 });
}

export function guestToken(request: NextRequest) {
  const token = request.cookies.get(GUEST_COOKIE)?.value;
  return token && /^[\w-]{43}$/.test(token) ? token : null;
}

export async function rateLimit(request: Request, bucket: string, limit = 30, seconds = 60) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const interval = Math.floor(Date.now() / (seconds * 1000));
  const key = hashToken(`${bucket}:${ip}:${interval}`);
  try {
    await SupportRate.updateOne({ key }, { $setOnInsert: { count: 0, expiresAt: new Date((interval + 2) * seconds * 1000) } }, { upsert: true });
  } catch (e) { if ((e as { code?: number }).code !== 11000) throw e; }
  const claimed = await SupportRate.findOneAndUpdate({ key, count: { $lt: limit } }, { $inc: { count: 1 } });
  if (!claimed) throw new ApiError("Please wait a moment before trying again.", { status: 429 });
}

export async function boundedJson(request: Request, maxBytes = 16000): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new ApiError("Request too large", { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Request body required");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError("Request too large", { status: 413 }); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError("Invalid JSON"); }
}

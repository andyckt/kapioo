import crypto from "node:crypto";

import { getKitchenApiKey } from "@/lib/env";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) {
    return null;
  }

  return match[1].trim();
}

function safeCompareKeys(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export type KitchenAuthResult =
  | { ok: true }
  | { ok: false; reason: "missing_env" | "missing_header" | "invalid_token" };

export function authorizeKitchenRequest(request: Request): KitchenAuthResult {
  const expectedKey = getKitchenApiKey();
  if (!expectedKey) {
    return { ok: false, reason: "missing_env" };
  }

  const providedKey = extractBearerToken(request);
  if (!providedKey) {
    return { ok: false, reason: "missing_header" };
  }

  if (!safeCompareKeys(providedKey, expectedKey)) {
    return { ok: false, reason: "invalid_token" };
  }

  return { ok: true };
}

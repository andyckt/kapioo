import type { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { formatZodError } from "@/lib/api/errors";
import { errorJson } from "@/lib/api/response";

export type ParsedResult<T> =
  | { data: T; error: null }
  | { data: null; error: NextResponse };

function buildValidationError(message: string) {
  return errorJson("Invalid request data", 400, {
    details: message,
  });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T, any, unknown>
): Promise<ParsedResult<T>> {
  try {
    const rawBody: unknown = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return {
        data: null,
        error: buildValidationError(formatZodError(parsed.error)),
      };
    }

    return { data: parsed.data, error: null };
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Request body is not valid JSON";

    return {
      data: null,
      error: buildValidationError(details),
    };
  }
}

export function parseSearchParams<T>(
  input: Request | URL | string,
  schema: ZodType<T, any, unknown>
): ParsedResult<T> {
  const url =
    typeof input === "string"
      ? new URL(input)
      : input instanceof Request
        ? new URL(input.url)
        : input;

  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return {
      data: null,
      error: buildValidationError(formatZodError(parsed.error)),
    };
  }

  return { data: parsed.data, error: null };
}

export function parseInput<T>(
  input: unknown,
  schema: ZodType<T, any, unknown>
): ParsedResult<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: buildValidationError(formatZodError(parsed.error)),
    };
  }

  return { data: parsed.data, error: null };
}

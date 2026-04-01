import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type JsonInit = number | ResponseInit | undefined;

function normalizeInit(init?: JsonInit): ResponseInit {
  if (typeof init === "number") {
    return { status: init };
  }

  return init ?? {};
}

export function successJson<T>(data: T, init?: JsonInit) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    normalizeInit(init)
  );
}

export function errorJson(
  error: string,
  init?: JsonInit,
  options?: {
    errorCode?: string;
    details?: string;
    /** Additional JSON fields (e.g. validation context); avoid keys that overlap errorCode/details. */
    extra?: Record<string, unknown>;
  }
) {
  return NextResponse.json<ApiErrorResponse & Record<string, unknown>>(
    {
      success: false,
      error,
      ...(options?.errorCode ? { errorCode: options.errorCode } : {}),
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.extra ?? {}),
    },
    normalizeInit(init)
  );
}

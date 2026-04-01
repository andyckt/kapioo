import type { ZodError } from "zod";

import { errorJson } from "@/lib/api/response";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: string;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? 400;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });

  return messages.join("; ") || "Invalid request data";
}

function isNamedError(error: unknown, name: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === name
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function handleRouteError(error: unknown, context: string) {
  if (isApiError(error)) {
    return errorJson(error.message, error.status, {
      errorCode: error.code,
      details: error.details,
    });
  }

  if (isNamedError(error, "ValidationError")) {
    return errorJson("Validation failed", 400, {
      details: getErrorMessage(error, "Validation failed"),
    });
  }

  if (isNamedError(error, "CastError")) {
    return errorJson("Invalid identifier", 400, {
      details: getErrorMessage(error, "Invalid identifier"),
    });
  }

  console.error(context, error);

  return errorJson("Internal server error", 500, {
    details: getErrorMessage(error, "Internal server error"),
  });
}

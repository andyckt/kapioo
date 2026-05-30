import type { DeliveryAgentCandidateRunPreview } from "@/lib/contracts/delivery-agent";
import type {
  RouteOptimizerBatchCreateRequest,
  RouteOptimizerBatchResult,
  RouteOptimizerBatchRunError,
  RouteOptimizerIntegrationRequest,
  RouteOptimizerRunResult,
} from "@/lib/integrations/route-optimizer/types";

export type FinalRouteRequestRun = {
  request: RouteOptimizerIntegrationRequest;
  candidateRun: DeliveryAgentCandidateRunPreview["runs"][number];
  runSlot: string;
  driverName: string;
  stopCount: number;
  externalId: string;
  idempotencyKey: string;
};

export type FinalRouteRequestOutcome = FinalRouteRequestRun & {
  status: "created" | "failed" | "missing";
  result?: RouteOptimizerRunResult;
  errorMessage?: string;
  errorCode?: string;
};

function readStringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readDriverNameFromResult(result: RouteOptimizerRunResult): string | undefined {
  const direct = readStringField(result.driver_name);
  if (direct) {
    return direct;
  }

  if (
    typeof result.run === "object" &&
    result.run !== null &&
    "driver_name" in result.run &&
    typeof (result.run as { driver_name?: unknown }).driver_name === "string"
  ) {
    return (result.run as { driver_name: string }).driver_name.trim();
  }

  return undefined;
}

export function zipPayloadWithCandidateRuns(input: {
  payload: RouteOptimizerBatchCreateRequest;
  candidateRuns: DeliveryAgentCandidateRunPreview["runs"];
}): FinalRouteRequestRun[] {
  const previewedRuns = input.candidateRuns.filter(
    (run) => run.previewStatus === "previewed" && run.stopCount > 0
  );

  return input.payload.runs.flatMap((request, index) => {
    const candidateRun =
      previewedRuns.find((run) => run.driverName === request.run.driver_name) ??
      previewedRuns[index];
    if (!candidateRun) {
      return [];
    }

    return [
      {
        request,
        candidateRun,
        runSlot: candidateRun.runSlot,
        driverName: candidateRun.driverName,
        stopCount: candidateRun.optimizedStopCount || candidateRun.stopCount,
        externalId: request.external_id ?? "",
        idempotencyKey: request.idempotency_key ?? "",
      },
    ];
  });
}

export function extractBatchRunResults(response: RouteOptimizerBatchResult): RouteOptimizerRunResult[] {
  if (Array.isArray(response.runs) && response.runs.length > 0) {
    return response.runs;
  }

  if (Array.isArray(response.results) && response.results.length > 0) {
    return response.results;
  }

  return [];
}

function readIssueMessage(issue: unknown): string | undefined {
  if (typeof issue === "string" && issue.trim()) {
    return issue.trim();
  }

  if (!issue || typeof issue !== "object") {
    return undefined;
  }

  const record = issue as Record<string, unknown>;
  return (
    readStringField(record.message) ??
    readStringField(record.error) ??
    readStringField(record.detail) ??
    readStringField(record.description)
  );
}

function readIssueCode(issue: unknown): string | undefined {
  if (!issue || typeof issue !== "object") {
    return undefined;
  }

  const record = issue as Record<string, unknown>;
  return readStringField(record.code) ?? readStringField(record.error_code);
}

export function readRunFailureDetails(result: RouteOptimizerRunResult | undefined): {
  message: string;
  code: string;
} | undefined {
  if (!result) {
    return undefined;
  }

  if (result.run_id) {
    return undefined;
  }

  const validationErrors = Array.isArray(result.validation_errors) ? result.validation_errors : [];
  if (validationErrors.length > 0) {
    const firstMessage = validationErrors.map(readIssueMessage).find(Boolean);
    const firstCode = validationErrors.map(readIssueCode).find(Boolean);
    return {
      message: firstMessage ?? "Route Optimizer rejected this run during validation.",
      code: firstCode ?? "ROUTE_OPTIMIZER_VALIDATION_ERROR",
    };
  }

  const geocodeFailures = Array.isArray(result.geocode_failures) ? result.geocode_failures : [];
  if (geocodeFailures.length > 0) {
    const firstMessage = geocodeFailures.map(readIssueMessage).find(Boolean);
    return {
      message: firstMessage ?? "Route Optimizer could not geocode one or more stops for this run.",
      code: "ROUTE_OPTIMIZER_GEOCODE_FAILED",
    };
  }

  const status = readStringField(result.status)?.toLowerCase();
  if (status === "failed" || status === "error" || status === "validation_error") {
    const warningMessage = Array.isArray(result.warnings)
      ? result.warnings.map(readIssueMessage).find(Boolean)
      : undefined;
    return {
      message:
        warningMessage ??
        `Route Optimizer returned status "${result.status}" without creating this run.`,
      code: "ROUTE_OPTIMIZER_RUN_FAILED",
    };
  }

  return undefined;
}

function readErrorMessage(error: RouteOptimizerBatchRunError | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  return (
    readStringField(error.message) ??
    readStringField(error.error) ??
    readStringField(error.detail)
  );
}

function readErrorCode(error: RouteOptimizerBatchRunError | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  return readStringField(error.code) ?? readStringField(error.error_code);
}

function readErrorExternalId(error: RouteOptimizerBatchRunError): string | undefined {
  return (
    readStringField(error.external_id) ??
    readStringField(error.externalId) ??
    readStringField(error.run_external_id)
  );
}

function readErrorIdempotencyKey(error: RouteOptimizerBatchRunError): string | undefined {
  return readStringField(error.idempotency_key) ?? readStringField(error.idempotencyKey);
}

function readErrorDriverName(error: RouteOptimizerBatchRunError): string | undefined {
  return readStringField(error.driver_name) ?? readStringField(error.driverName);
}

function normalizeBatchErrors(response: RouteOptimizerBatchResult): RouteOptimizerBatchRunError[] {
  const errors: RouteOptimizerBatchRunError[] = [];

  const appendErrors = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === "object") {
          errors.push(entry as RouteOptimizerBatchRunError);
        }
      }
    }
  };

  appendErrors(response.errors);
  appendErrors(response.failed_runs);

  for (const result of extractBatchRunResults(response)) {
    const failure = readRunFailureDetails(result);
    if (!failure) {
      continue;
    }

    errors.push({
      external_id: readStringField(result.external_id),
      idempotency_key: readStringField(result.idempotency_key),
      driver_name: readDriverNameFromResult(result),
      message: failure.message,
      code: failure.code,
      validation_errors: result.validation_errors,
      geocode_failures: result.geocode_failures,
    });
  }

  return errors;
}

function findMatchingError(input: {
  errors: RouteOptimizerBatchRunError[];
  externalId: string;
  idempotencyKey: string;
  driverName: string;
  runIndex: number;
}): RouteOptimizerBatchRunError | undefined {
  return input.errors.find((error) => {
    const externalId = readErrorExternalId(error);
    if (input.externalId && externalId === input.externalId) {
      return true;
    }
    const idempotencyKey = readErrorIdempotencyKey(error);
    if (input.idempotencyKey && idempotencyKey === input.idempotencyKey) {
      return true;
    }
    const driverName = readErrorDriverName(error);
    if (driverName && driverName === input.driverName) {
      return true;
    }
    if (typeof error.run_index === "number" && error.run_index === input.runIndex) {
      return true;
    }
    if (typeof error.index === "number" && error.index === input.runIndex) {
      return true;
    }
    if (typeof error.field === "string" && input.externalId && error.field.includes(input.externalId)) {
      return true;
    }
    if (typeof error.field === "string" && error.field.includes(`runs[${input.runIndex}]`)) {
      return true;
    }
    return false;
  });
}

function findMatchingResult(input: {
  results: RouteOptimizerRunResult[];
  externalId: string;
  idempotencyKey: string;
  driverName: string;
}): RouteOptimizerRunResult | undefined {
  return (
    input.results.find((result) => input.externalId && result.external_id === input.externalId) ??
    input.results.find(
      (result) => input.idempotencyKey && result.idempotency_key === input.idempotencyKey
    ) ??
    input.results.find((result) => readDriverNameFromResult(result) === input.driverName)
  );
}

export function resolveFinalRouteRequestOutcomes(input: {
  requestRuns: FinalRouteRequestRun[];
  response: RouteOptimizerBatchResult;
}): FinalRouteRequestOutcome[] {
  const results = extractBatchRunResults(input.response);
  const errors = normalizeBatchErrors(input.response);
  const usedResultIndexes = new Set<number>();

  return input.requestRuns.map((requestRun, index) => {
    let result = findMatchingResult({
      results,
      externalId: requestRun.externalId,
      idempotencyKey: requestRun.idempotencyKey,
      driverName: requestRun.driverName,
    });

    if (result) {
      const matchedResultIndex = results.findIndex((candidate) => candidate === result);
      if (matchedResultIndex >= 0) {
        usedResultIndexes.add(matchedResultIndex);
      }
    } else if (
      results[index] &&
      !usedResultIndexes.has(index) &&
      results.length === input.requestRuns.length
    ) {
      result = results[index];
      usedResultIndexes.add(index);
    }

    const runFailure = readRunFailureDetails(result);
    const error = findMatchingError({
      errors,
      externalId: requestRun.externalId,
      idempotencyKey: requestRun.idempotencyKey,
      driverName: requestRun.driverName,
      runIndex: index,
    });

    if (result?.run_id) {
      return {
        ...requestRun,
        status: "created",
        result,
      };
    }

    if (runFailure) {
      return {
        ...requestRun,
        status: "failed",
        result,
        errorMessage: runFailure.message,
        errorCode: runFailure.code,
      };
    }

    if (error) {
      return {
        ...requestRun,
        status: "failed",
        errorMessage: readErrorMessage(error),
        errorCode: readErrorCode(error),
      };
    }

    return {
      ...requestRun,
      status: "missing",
      errorMessage: "Route Optimizer did not return a result for this run.",
      errorCode: "ROUTE_OPTIMIZER_RUN_MISSING",
    };
  });
}

export function summarizeBatchCreateResponse(response: RouteOptimizerBatchResult) {
  const runResults = extractBatchRunResults(response);
  const normalizedErrors = normalizeBatchErrors(response);
  return {
    status: response.status,
    planningSessionId: response.planning_session_id,
    totalRequested: response.total_requested,
    totalSucceeded: response.total_succeeded,
    totalFailed: response.total_failed,
    successfulExternalIds: runResults
      .filter((result) => Boolean(result.run_id))
      .map((result) => result.external_id)
      .filter((value): value is string => Boolean(value)),
    failedExternalIds: normalizedErrors
      .map((error) => readErrorExternalId(error))
      .filter((value): value is string => Boolean(value)),
    errors: normalizedErrors,
  };
}

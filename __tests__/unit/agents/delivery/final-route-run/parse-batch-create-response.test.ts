import {
  extractBatchRunResults,
  resolveFinalRouteRequestOutcomes,
  summarizeBatchCreateResponse,
  zipPayloadWithCandidateRuns,
} from "@/lib/agents/delivery/final-route-run/parse-batch-create-response";

describe("parse-batch-create-response", () => {
  const candidateRuns = [
    {
      runSlot: "A",
      driverName: "DT",
      role: "provider",
      stopCount: 14,
      optimizedStopCount: 14,
      optimizedStops: [],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
    {
      runSlot: "B",
      driverName: "Marco",
      role: "receiver",
      stopCount: 11,
      optimizedStopCount: 11,
      optimizedStops: [],
      routeOptimizerWarnings: [],
      routeOptimizerValidationErrors: [],
      geocodeFailures: [],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
  ] as const;

  const payload = {
    planning_session_id: "planning-123",
    runs: [
      {
        planning_session_id: "planning-123",
        external_id: "ext-dt",
        idempotency_key: "idem-dt",
        created_by_integration: "kapioo-admin",
        run: {
          run_date: "2026-06-09",
          driver_name: "DT",
          start_location: "Kitchen",
          start_time: "09:00",
          travel_mode: "driving",
        },
        customers: [],
      },
      {
        planning_session_id: "planning-123",
        external_id: "ext-marco",
        idempotency_key: "idem-marco",
        created_by_integration: "kapioo-admin",
        run: {
          run_date: "2026-06-09",
          driver_name: "Marco",
          start_location: "Kitchen",
          start_time: "09:00",
          travel_mode: "driving",
        },
        customers: [],
      },
    ],
  };

  it("prefers runs over results when extracting batch results", () => {
    const results = extractBatchRunResults({
      runs: [{ run_id: "run-1", external_id: "ext-marco" }],
      results: [{ run_id: "legacy-1", external_id: "legacy" }],
    });

    expect(results).toEqual([{ run_id: "run-1", external_id: "ext-marco" }]);
  });

  it("matches outcomes by external_id and marks missing runs", () => {
    const requestRuns = zipPayloadWithCandidateRuns({
      payload,
      candidateRuns: [...candidateRuns],
    });
    const outcomes = resolveFinalRouteRequestOutcomes({
      requestRuns,
      response: {
        total_requested: 2,
        total_succeeded: 1,
        total_failed: 1,
        runs: [{ run_id: "run-marco", external_id: "ext-marco", idempotency_key: "idem-marco" }],
        errors: [{ external_id: "ext-dt", message: "DT validation failed", code: "VALIDATION_ERROR" }],
      },
    });

    expect(outcomes).toEqual([
      expect.objectContaining({
        driverName: "DT",
        status: "failed",
        errorMessage: "DT validation failed",
        errorCode: "VALIDATION_ERROR",
      }),
      expect.objectContaining({
        driverName: "Marco",
        status: "created",
        result: expect.objectContaining({ run_id: "run-marco" }),
      }),
    ]);
  });

  it("summarizes batch response totals and external ids", () => {
    const summary = summarizeBatchCreateResponse({
      status: "partial",
      planning_session_id: "planning-123",
      total_requested: 2,
      total_succeeded: 1,
      total_failed: 1,
      runs: [{ run_id: "run-marco", external_id: "ext-marco" }],
      errors: [{ external_id: "ext-dt", message: "failed" }],
    });

    expect(summary).toEqual({
      status: "partial",
      planningSessionId: "planning-123",
      totalRequested: 2,
      totalSucceeded: 1,
      totalFailed: 1,
      successfulExternalIds: ["ext-marco"],
      failedExternalIds: ["ext-dt"],
      errors: [{ external_id: "ext-dt", message: "failed" }],
    });
  });

  it("treats validation_errors on a failed run entry as a failed outcome", () => {
    const requestRuns = zipPayloadWithCandidateRuns({
      payload,
      candidateRuns: [...candidateRuns],
    });
    const outcomes = resolveFinalRouteRequestOutcomes({
      requestRuns,
      response: {
        total_requested: 2,
        total_succeeded: 1,
        total_failed: 1,
        runs: [
          {
            external_id: "ext-dt",
            driver_name: "DT",
            validation_errors: [{ code: "ENDPOINT_REQUIRED", message: "DT route needs an end point" }],
          },
          { run_id: "run-marco", external_id: "ext-marco", idempotency_key: "idem-marco" },
        ],
      },
    });

    expect(outcomes[0]).toMatchObject({
      driverName: "DT",
      status: "failed",
      errorCode: "ENDPOINT_REQUIRED",
      errorMessage: "DT route needs an end point",
    });
    expect(outcomes[1]).toMatchObject({
      driverName: "Marco",
      status: "created",
    });
  });

  it("matches filtered retry payloads by driver name instead of index", () => {
    const requestRuns = zipPayloadWithCandidateRuns({
      payload: {
        planning_session_id: "planning-123",
        runs: [payload.runs[0]],
      },
      candidateRuns: [...candidateRuns],
    });

    expect(requestRuns).toHaveLength(1);
    expect(requestRuns[0]?.driverName).toBe("DT");
  });
});

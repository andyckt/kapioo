import {
  getDeliveryLearningBackfillCliUsage,
  parseDeliveryLearningBackfillCliArgs,
} from "@/lib/agents/delivery/learning/backfill/backfill-cli-args";

describe("parseDeliveryLearningBackfillCliArgs", () => {
  it("parses required date range and safety flags", () => {
    const parsed = parseDeliveryLearningBackfillCliArgs([
      "--start=2026-05-01",
      "--end",
      "2026-05-31",
      "--profile-id=daily-v1-current-dt-marco-self",
      "--max-dates=31",
      "--batch-id=batch-123",
      "--force",
      "--dry-run",
      "--ro-delay-ms=8000",
      "--ro-retries=3",
      "--ro-retry-delay-ms=25000",
      "--log-progress",
      "--confirm",
    ]);

    expect(parsed).toMatchObject({
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      profileId: "daily-v1-current-dt-marco-self",
      maxDates: 31,
      backfillBatchId: "batch-123",
      force: true,
      dryRun: true,
      routeOptimizerRequestDelayMs: 8000,
      routeOptimizerRateLimitRetries: 3,
      routeOptimizerRateLimitRetryDelayMs: 25000,
      logProgress: true,
      confirm: true,
      help: false,
    });
  });

  it("requires start and end dates unless help is requested", () => {
    expect(() => parseDeliveryLearningBackfillCliArgs(["--end=2026-05-31"])).toThrow(
      "--start=YYYY-MM-DD is required"
    );
    expect(() => parseDeliveryLearningBackfillCliArgs(["--start=2026-05-01"])).toThrow(
      "--end=YYYY-MM-DD is required"
    );

    expect(parseDeliveryLearningBackfillCliArgs(["--help"])).toMatchObject({
      help: true,
      confirm: false,
    });
    expect(getDeliveryLearningBackfillCliUsage()).toContain("--confirm");
    expect(getDeliveryLearningBackfillCliUsage()).toContain("--dry-run");
    expect(getDeliveryLearningBackfillCliUsage()).toContain("--ro-delay-ms");
  });

  it("rejects invalid dates and invalid max date counts", () => {
    expect(() =>
      parseDeliveryLearningBackfillCliArgs(["--start=2026/05/01", "--end=2026-05-31"])
    ).toThrow("deliveryDate must be YYYY-MM-DD");

    expect(() =>
      parseDeliveryLearningBackfillCliArgs([
        "--start=2026-05-01",
        "--end=2026-05-31",
        "--max-dates=0",
      ])
    ).toThrow("--max-dates must be a positive integer");

    expect(() =>
      parseDeliveryLearningBackfillCliArgs([
        "--start=2026-05-01",
        "--end=2026-05-31",
        "--ro-delay-ms=-1",
      ])
    ).toThrow("--ro-delay-ms must be a non-negative integer");
  });

  it("uses safe RO throttle defaults when timing flags are omitted", () => {
    const parsed = parseDeliveryLearningBackfillCliArgs([
      "--start=2026-05-01",
      "--end=2026-05-31",
      "--confirm",
    ]);

    expect(parsed).toMatchObject({
      routeOptimizerRequestDelayMs: 7000,
      routeOptimizerRateLimitRetries: 2,
      routeOptimizerRateLimitRetryDelayMs: 20000,
    });
  });
});

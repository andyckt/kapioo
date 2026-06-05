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
  });
});

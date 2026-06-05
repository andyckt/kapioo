const {
  connectToDatabaseMock,
  fetchRouteOptimizerRunsByDateMock,
  findOneAndUpdateMock,
  findOneMock,
  getHistoricalOrdersForLearningMock,
} = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  fetchRouteOptimizerRunsByDateMock: vi.fn(),
  findOneAndUpdateMock: vi.fn(),
  findOneMock: vi.fn(),
  getHistoricalOrdersForLearningMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: connectToDatabaseMock,
}));

vi.mock("@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning", () => ({
  getHistoricalOrdersForLearning: getHistoricalOrdersForLearningMock,
}));

vi.mock("@/lib/integrations/route-optimizer/fetch-runs-by-date", () => ({
  fetchRouteOptimizerRunsByDate: fetchRouteOptimizerRunsByDateMock,
}));

vi.mock("@/models/DeliveryAgentLearningCase", () => ({
  default: {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  backfillDeliveryAgentLearningCasesForDateRange,
  buildLearningBackfillDateList,
} from "@/lib/agents/delivery/learning/backfill/backfill-learning-cases-for-date-range";
import { buildDeliveryAgentLearningCaseFromHistoricalData } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-for-date";
import { RouteOptimizerRateLimitError } from "@/lib/integrations/route-optimizer/errors";
import {
  DELIVERY_DATE,
  buildOnTimeSingleRunResponse,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";
import { makeLearningOrder } from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

function mockExistingLearningCase(existing: unknown): void {
  findOneMock.mockReturnValue({
    select: () => ({
      lean: () => Promise.resolve(existing),
    }),
  });
}

describe("backfillDeliveryAgentLearningCasesForDateRange", () => {
  beforeEach(() => {
    connectToDatabaseMock.mockReset();
    fetchRouteOptimizerRunsByDateMock.mockReset();
    findOneAndUpdateMock.mockReset();
    findOneMock.mockReset();
    getHistoricalOrdersForLearningMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
    mockExistingLearningCase(null);
    findOneAndUpdateMock.mockImplementation((_filter, update) => ({
      toObject: () => update.$set,
    }));
  });

  it("builds an inclusive date list and enforces maxDates", () => {
    expect(
      buildLearningBackfillDateList({
        startDate: "2026-05-29",
        endDate: "2026-05-31",
      })
    ).toEqual(["2026-05-29", "2026-05-30", "2026-05-31"]);

    expect(() =>
      buildLearningBackfillDateList({
        startDate: "2026-05-29",
        endDate: "2026-05-31",
        maxDates: 2,
      })
    ).toThrow("exceeds maxDates");
  });

  it("skips an existing learning case without fetching orders or Route Optimizer history", async () => {
    mockExistingLearningCase({
      caseKey: `delivery-agent-learning-case:${DELIVERY_DATE}:daily-v1-current-dt-marco-self`,
      sourceHash: "existing-hash",
      reviewStatus: "reviewed",
      quality: { learningLabel: "positive" },
    });

    const summary = await backfillDeliveryAgentLearningCasesForDateRange({
      startDate: DELIVERY_DATE,
      endDate: DELIVERY_DATE,
      backfillBatchId: "batch-test",
    });

    expect(getHistoricalOrdersForLearningMock).not.toHaveBeenCalled();
    expect(fetchRouteOptimizerRunsByDateMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      savedCount: 0,
      skippedCount: 1,
      errorCount: 0,
    });
    expect(summary.results[0]).toMatchObject({
      status: "skipped_existing",
      learningLabel: "positive",
      reviewStatus: "reviewed",
    });
  });

  it("skips dates with no historical Admin orders before calling Route Optimizer", async () => {
    getHistoricalOrdersForLearningMock.mockResolvedValue([]);

    const summary = await backfillDeliveryAgentLearningCasesForDateRange({
      startDate: DELIVERY_DATE,
      endDate: DELIVERY_DATE,
      backfillBatchId: "batch-test",
    });

    expect(getHistoricalOrdersForLearningMock).toHaveBeenCalledTimes(1);
    expect(fetchRouteOptimizerRunsByDateMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    expect(summary.results[0]).toMatchObject({
      status: "skipped_no_orders",
      orderCount: 0,
    });
  });

  it("saves a learning case for a date with Admin orders and RO history", async () => {
    getHistoricalOrdersForLearningMock.mockResolvedValue([
      makeLearningOrder({ deliveryDate: DELIVERY_DATE }),
    ]);
    fetchRouteOptimizerRunsByDateMock.mockResolvedValue(buildOnTimeSingleRunResponse());

    const summary = await backfillDeliveryAgentLearningCasesForDateRange({
      startDate: DELIVERY_DATE,
      endDate: DELIVERY_DATE,
      backfillBatchId: "batch-test",
    });

    expect(fetchRouteOptimizerRunsByDateMock).toHaveBeenCalledWith(DELIVERY_DATE);
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({
      savedCount: 1,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(summary.results[0]).toMatchObject({
      status: "saved",
      orderCount: 1,
      routeOptimizerRunCount: 1,
      learningLabel: "positive",
      reviewStatus: "none",
    });
  });

  it("continues to the next date after a Route Optimizer read failure", async () => {
    getHistoricalOrdersForLearningMock.mockResolvedValue([
      makeLearningOrder({ deliveryDate: DELIVERY_DATE }),
    ]);
    fetchRouteOptimizerRunsByDateMock
      .mockRejectedValueOnce(new RouteOptimizerRateLimitError("RATE_LIMITED"))
      .mockResolvedValueOnce(buildOnTimeSingleRunResponse());

    const summary = await backfillDeliveryAgentLearningCasesForDateRange({
      startDate: "2026-05-31",
      endDate: "2026-06-01",
      backfillBatchId: "batch-test",
    });

    expect(fetchRouteOptimizerRunsByDateMock).toHaveBeenCalledTimes(2);
    expect(summary.savedCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(summary.results[0]).toMatchObject({
      deliveryDate: "2026-05-31",
      status: "failed",
      error: {
        code: "ROUTE_OPTIMIZER_RATE_LIMITED",
        retryable: true,
      },
    });
    expect(summary.results[1]).toMatchObject({
      deliveryDate: "2026-06-01",
      status: "saved",
    });
  });

  it("does not rewrite an unchanged case even when force is enabled", async () => {
    const orders = [makeLearningOrder({ deliveryDate: DELIVERY_DATE })];
    const routeOptimizerResponse = buildOnTimeSingleRunResponse();
    const expectedCase = buildDeliveryAgentLearningCaseFromHistoricalData({
      deliveryDate: DELIVERY_DATE,
      orders,
      routeOptimizerResponse,
    });
    mockExistingLearningCase({
      caseKey: expectedCase.caseKey,
      sourceHash: expectedCase.sourceHash,
      reviewStatus: "reviewed",
      quality: { learningLabel: "positive" },
    });
    getHistoricalOrdersForLearningMock.mockResolvedValue(orders);
    fetchRouteOptimizerRunsByDateMock.mockResolvedValue(routeOptimizerResponse);

    const summary = await backfillDeliveryAgentLearningCasesForDateRange({
      startDate: DELIVERY_DATE,
      endDate: DELIVERY_DATE,
      backfillBatchId: "batch-test",
      force: true,
    });

    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    expect(summary.results[0]).toMatchObject({
      status: "skipped_unchanged",
      sourceHash: expectedCase.sourceHash,
      learningLabel: "positive",
      reviewStatus: "reviewed",
    });
  });
});

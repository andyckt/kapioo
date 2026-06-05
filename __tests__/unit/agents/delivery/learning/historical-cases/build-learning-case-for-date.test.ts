const {
  connectToDatabaseMock,
  fetchRouteOptimizerRunsByDateMock,
  findOneAndUpdateMock,
  getHistoricalOrdersForLearningMock,
} = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  fetchRouteOptimizerRunsByDateMock: vi.fn(),
  findOneAndUpdateMock: vi.fn(),
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
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  buildAndUpsertDeliveryAgentLearningCaseForDate,
  buildDeliveryAgentLearningCaseFromHistoricalData,
  upsertDeliveryAgentLearningCase,
} from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-for-date";
import {
  DELIVERY_DATE,
  buildLateDriverGoodRouteResponse,
  buildOnTimeSingleRunResponse,
} from "@/__tests__/unit/agents/delivery/learning/operational-fixtures";
import {
  makeLearningOrder,
  parsedEmptyRunsByDateResponse,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

describe("buildDeliveryAgentLearningCaseFromHistoricalData", () => {
  beforeEach(() => {
    connectToDatabaseMock.mockReset();
    fetchRouteOptimizerRunsByDateMock.mockReset();
    findOneAndUpdateMock.mockReset();
    getHistoricalOrdersForLearningMock.mockReset();
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  it("builds a positive one-date learning case from matched on-time historical data", () => {
    const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
      deliveryDate: DELIVERY_DATE,
      orders: [makeLearningOrder({ deliveryDate: DELIVERY_DATE })],
      routeOptimizerResponse: buildOnTimeSingleRunResponse(),
    });

    expect(learningCase.deliveryDate).toBe(DELIVERY_DATE);
    expect(learningCase.caseKey).toContain(DELIVERY_DATE);
    expect(learningCase.sourceHash).toMatch(/^[a-f0-9]{32}$/);
    expect(learningCase.matchedStops).toHaveLength(1);
    expect(learningCase.matchCoverage.matchCoveragePercent).toBe(100);
    expect(learningCase.coordinateCoverage.coveragePercent).toBe(100);
    expect(learningCase.geoFeatures.centerPoint).toEqual({ lat: 43.65, lng: -79.38 });
    expect(learningCase.outcomeFeatures.runCompletedBefore1pm).toBe(true);
    expect(learningCase.quality).toMatchObject({
      learningLabel: "positive",
      canUseForPositiveRetrieval: true,
    });
    expect(learningCase.reviewStatus).toBe("none");
  });

  it("treats a late finish caused by driver start delay as weak positive, not a route-design failure", () => {
    const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
      deliveryDate: DELIVERY_DATE,
      orders: [makeLearningOrder({ deliveryDate: DELIVERY_DATE })],
      routeOptimizerResponse: buildLateDriverGoodRouteResponse(),
    });

    expect(learningCase.outcomeFeatures.runCompletedBefore1pm).toBe(false);
    expect(learningCase.outcomeFeatures.routeWouldHaveMetDeadlineIfStartedOnTime).toBe(true);
    expect(learningCase.outcomeFeatures.latenessAttribution).toBe("driver_start_delay");
    expect(learningCase.quality.learningLabel).toBe("weak_positive");
    expect(learningCase.quality.canUseForPositiveRetrieval).toBe(true);
  });

  it("excludes a date with Admin orders but no Route Optimizer historical runs", () => {
    const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
      deliveryDate: DELIVERY_DATE,
      orders: [makeLearningOrder({ deliveryDate: DELIVERY_DATE })],
      routeOptimizerResponse: parsedEmptyRunsByDateResponse,
    });

    expect(learningCase.matchedStops).toHaveLength(0);
    expect(learningCase.unmatchedOrders).toHaveLength(1);
    expect(learningCase.quality).toMatchObject({
      learningLabel: "excluded",
      excludeReason: "no_route_optimizer_runs",
      canUseForPositiveRetrieval: false,
    });
    expect(learningCase.reviewStatus).toBe("pending");
    expect(learningCase.warnings).toEqual(expect.arrayContaining(["no_route_optimizer_runs"]));
  });

  it("upserts by caseKey and returns the saved learning case", async () => {
    const learningCase = buildDeliveryAgentLearningCaseFromHistoricalData({
      deliveryDate: DELIVERY_DATE,
      orders: [makeLearningOrder({ deliveryDate: DELIVERY_DATE })],
      routeOptimizerResponse: buildOnTimeSingleRunResponse(),
    });
    const savedPayload = {
      ...learningCase,
      createdAt: new Date("2026-06-01T12:00:00.000Z"),
      updatedAt: new Date("2026-06-01T12:00:00.000Z"),
    };
    findOneAndUpdateMock.mockResolvedValue({
      toObject: () => savedPayload,
    });

    const saved = await upsertDeliveryAgentLearningCase(learningCase);

    expect(connectToDatabaseMock).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { caseKey: learningCase.caseKey },
      { $set: learningCase },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
    expect(saved).toEqual(savedPayload);
  });

  it("fetches one date of Admin orders and RO history before upserting", async () => {
    const orders = [makeLearningOrder({ deliveryDate: DELIVERY_DATE })];
    const routeOptimizerResponse = buildOnTimeSingleRunResponse();
    getHistoricalOrdersForLearningMock.mockResolvedValue(orders);
    fetchRouteOptimizerRunsByDateMock.mockResolvedValue(routeOptimizerResponse);
    findOneAndUpdateMock.mockImplementation((_filter, update) => ({
      toObject: () => update.$set,
    }));

    const result = await buildAndUpsertDeliveryAgentLearningCaseForDate({
      deliveryDate: DELIVERY_DATE,
      backfillBatchId: "batch-1",
    });

    expect(getHistoricalOrdersForLearningMock).toHaveBeenCalledWith({
      deliveryDate: DELIVERY_DATE,
    });
    expect(fetchRouteOptimizerRunsByDateMock).toHaveBeenCalledWith(DELIVERY_DATE);
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);
    expect(result.learningCase.backfillBatchId).toBe("batch-1");
    expect(result.savedLearningCase.caseKey).toBe(result.learningCase.caseKey);
  });
});

import { clearCollections, setupTestDb, teardownTestDb } from "../../../helpers/db";

import {
  buildFullLearningCasePayload,
  buildMinimalLearningCaseInput,
  buildThreeDriverResourceProfileFeatures,
  buildTwoDriverResourceProfileFeatures,
} from "@/__tests__/unit/agents/delivery/learning/learning-case-fixtures";
import DeliveryAgentLearningCase from "@/models/DeliveryAgentLearningCase";

describe("models/DeliveryAgentLearningCase integration", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("creates a document with minimal valid placeholders", async () => {
    const payload = buildMinimalLearningCaseInput();
    const created = await DeliveryAgentLearningCase.create(payload);

    expect(created.deliveryDate).toBe("2026-05-31");
    expect(created.profileId).toBe("daily-default");
    expect(created.schemaVersion).toBe("learning-case-v1");
    expect(created.reviewStatus).toBe("none");
    expect(created.quality.learningLabel).toBe("uncertain");
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("stores route optimizer snapshot, geo features, and coordinate snapshots", async () => {
    const payload = buildFullLearningCasePayload();
    const created = await DeliveryAgentLearningCase.create(payload);

    expect(created.routeOptimizerRunsSnapshot?.runs).toHaveLength(1);
    expect(created.coordinateSnapshots).toHaveLength(2);
    expect(created.geoFeatures?.dynamicOutliers).toHaveLength(1);
    expect(created.geoFeatures?.sameBuildingClusterCount).toBe(1);
    expect(created.matchedStops[0]?.matchMethod).toBe("order_id");
  });

  it("stores 2-driver and 3-driver resource profile features", async () => {
    const twoDriver = await DeliveryAgentLearningCase.create({
      ...buildMinimalLearningCaseInput(),
      caseKey: "delivery-agent-learning-case:2026-05-30:daily-v1-2-driver",
      deliveryDate: "2026-05-30",
      profileId: "daily-v1-2-driver",
      resourceProfileFeatures: buildTwoDriverResourceProfileFeatures(),
    });

    const threeDriver = await DeliveryAgentLearningCase.create({
      ...buildMinimalLearningCaseInput(),
      caseKey: "delivery-agent-learning-case:2026-05-29:daily-v1-3-driver",
      deliveryDate: "2026-05-29",
      profileId: "daily-v1-3-driver",
      resourceProfileFeatures: buildThreeDriverResourceProfileFeatures(),
    });

    expect(twoDriver.resourceProfileFeatures?.hiredDriverRunCount).toBe(2);
    expect(twoDriver.resourceProfileFeatures?.profileCompatibilityForFuture).toBe(
      "transferable_profile"
    );
    expect(threeDriver.resourceProfileFeatures?.hiredDriverRunCount).toBe(3);
    expect(threeDriver.resourceProfileFeatures?.profileCompatibilityForFuture).toBe("same_profile");
  });

  it("enforces unique caseKey", async () => {
    const payload = buildMinimalLearningCaseInput();

    await DeliveryAgentLearningCase.create(payload);

    await expect(DeliveryAgentLearningCase.create(payload)).rejects.toThrow(/duplicate key/i);
  });

  it("supports reviewStatus none, pending, and reviewed", async () => {
    const pending = await DeliveryAgentLearningCase.create({
      ...buildMinimalLearningCaseInput(),
      caseKey: "delivery-agent-learning-case:2026-05-28:daily-default",
      deliveryDate: "2026-05-28",
      reviewStatus: "pending",
    });

    const reviewed = await DeliveryAgentLearningCase.create({
      ...buildMinimalLearningCaseInput(),
      caseKey: "delivery-agent-learning-case:2026-05-27:daily-default",
      deliveryDate: "2026-05-27",
      reviewStatus: "reviewed",
    });

    expect(pending.reviewStatus).toBe("pending");
    expect(reviewed.reviewStatus).toBe("reviewed");
  });
});

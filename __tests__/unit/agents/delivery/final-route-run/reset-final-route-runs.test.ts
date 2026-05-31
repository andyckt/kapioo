import { beforeEach, describe, expect, it, vi } from "vitest";

const runLogMocks = vi.hoisted(() => ({
  findByDuplicateKeyMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock("@/lib/agents/delivery/run-log", () => ({
  buildDeliveryAgentDuplicateKey: (input: { deliveryDate: string; profileId: string }) =>
    `daily-delivery-agent:${input.deliveryDate}:${input.profileId}`,
  findDeliveryAgentRunByDuplicateKey: runLogMocks.findByDuplicateKeyMock,
  findDeliveryAgentRunById: runLogMocks.findByIdMock,
}));

import {
  FinalRouteResetError,
  resetFinalRouteRuns,
} from "@/lib/agents/delivery/final-route-run/reset-final-route-runs";

describe("resetFinalRouteRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires confirmation", async () => {
    await expect(
      resetFinalRouteRuns({
        deliveryDate: "2026-06-09",
        profileId: "daily-v1",
        confirmed: false,
        resetBy: "donald@kapioo.com",
      })
    ).rejects.toBeInstanceOf(FinalRouteResetError);
  });

  it("snapshots history and increments generation", async () => {
    const updateOne = vi.fn().mockResolvedValue(undefined);
    runLogMocks.findByDuplicateKeyMock.mockResolvedValue({
      id: "run-123",
      reviewStatus: "approved",
      finalRouteGeneration: 1,
      finalRouteOptimizerMetadata: {
        finalRouteOptimizerStatus: "created",
        systemRecommendedCandidateId: "c1",
        selectedCandidateId: "c1",
        didDonaldOverrideRecommendation: false,
      },
      routeOptimizerRuns: [{ runId: "ro-1", externalId: "ext-1" }],
      learningArtifacts: { finalRouteResetHistory: [] },
      updateOne,
    });

    const result = await resetFinalRouteRuns({
      deliveryDate: "2026-06-09",
      profileId: "daily-v1",
      confirmed: true,
      resetBy: "donald@kapioo.com",
      markMissing: true,
    });

    expect(result.finalRouteGeneration).toBe(2);
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $set: expect.objectContaining({
          finalRouteGeneration: 2,
          routeOptimizerRuns: [],
          learningArtifacts: expect.objectContaining({
            finalRouteResetHistory: expect.arrayContaining([
              expect.objectContaining({
                previousGeneration: 1,
                nextGeneration: 2,
                markMissing: true,
              }),
            ]),
          }),
        }),
      })
    );
  });
});

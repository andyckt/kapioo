import { describe, expect, it } from "vitest";

import { resolveDeliveryAgentOperationalState } from "@/lib/agents/delivery/review-plan/resolve-operational-review-state";
import {
  isImprovementRequestedStatus,
  normalizeReviewStatusForDisplay,
} from "@/lib/agents/delivery/review-plan/review-status-helpers";

describe("resolveDeliveryAgentOperationalState", () => {
  it("returns pending_review when no review decision exists", () => {
    expect(resolveDeliveryAgentOperationalState({})).toBe("pending_review");
  });

  it("maps legacy rejected/edited to improvement_requested", () => {
    expect(normalizeReviewStatusForDisplay("rejected")).toBe("improvement_requested");
    expect(normalizeReviewStatusForDisplay("edited")).toBe("improvement_requested");
    expect(isImprovementRequestedStatus("rejected")).toBe(true);
    expect(
      resolveDeliveryAgentOperationalState({ reviewStatus: "rejected" })
    ).toBe("improvement_requested");
  });

  it("returns approved when plan is approved without final runs", () => {
    expect(
      resolveDeliveryAgentOperationalState({
        reviewStatus: "approved",
      })
    ).toBe("approved");
  });

  it("returns final_route_created when approved with created metadata and runs", () => {
    expect(
      resolveDeliveryAgentOperationalState({
        reviewStatus: "approved",
        finalRouteOptimizerMetadata: { finalRouteOptimizerStatus: "created" },
        routeOptimizerRunCount: 2,
      })
    ).toBe("final_route_created");
  });

  it("returns final_route_partial_created for partial metadata", () => {
    expect(
      resolveDeliveryAgentOperationalState({
        reviewStatus: "approved",
        finalRouteOptimizerMetadata: { finalRouteOptimizerStatus: "partial_created" },
      })
    ).toBe("final_route_partial_created");
  });

  it("returns final_route_missing_or_deleted when marked missing", () => {
    expect(
      resolveDeliveryAgentOperationalState({
        reviewStatus: "approved",
        finalRouteOptimizerMetadata: { finalRouteOptimizerStatus: "created" },
        finalRouteRunsMarkedMissingAt: "2026-06-09T12:00:00.000Z",
        routeOptimizerRunCount: 1,
      })
    ).toBe("final_route_missing_or_deleted");
  });
});

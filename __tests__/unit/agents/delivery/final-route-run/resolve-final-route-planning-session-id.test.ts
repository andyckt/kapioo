import { resolveFinalRoutePlanningSessionId } from "@/lib/agents/delivery/final-route-run/resolve-final-route-planning-session-id";
import { FinalRouteRunStateError } from "@/lib/agents/delivery/final-route-run/errors";
import type { IDeliveryAgentRun } from "@/models/DeliveryAgentRun";

function buildRun(overrides: Partial<IDeliveryAgentRun> = {}): IDeliveryAgentRun {
  return {
    id: "run-123",
    planningSessionId: "planning-session-abc",
    ...overrides,
  } as unknown as IDeliveryAgentRun;
}

describe("resolveFinalRoutePlanningSessionId", () => {
  it("reuses planning session from failed final route metadata", () => {
    const resolved = resolveFinalRoutePlanningSessionId(
      buildRun({
        finalRouteOptimizerMetadata: {
          finalRouteOptimizerStatus: "failed",
          systemRecommendedCandidateId: "candidate:a",
          selectedCandidateId: "candidate:a",
          didDonaldOverrideRecommendation: false,
          planningSessionId: "ro-session-from-failure",
          planningSessionSource: "delivery_agent_planning_session",
        },
      })
    );

    expect(resolved).toEqual({
      planningSessionId: "ro-session-from-failure",
      source: "final_route_metadata",
    });
  });

  it("reuses routeOptimizerPlanningSessionId when metadata is absent", () => {
    const resolved = resolveFinalRoutePlanningSessionId(
      buildRun({
        routeOptimizerPlanningSessionId: "ro-session-saved",
      })
    );

    expect(resolved).toEqual({
      planningSessionId: "ro-session-saved",
      source: "route_optimizer_planning_session",
    });
  });

  it("falls back to delivery agent planningSessionId", () => {
    const resolved = resolveFinalRoutePlanningSessionId(buildRun());

    expect(resolved).toEqual({
      planningSessionId: "planning-session-abc",
      source: "delivery_agent_planning_session",
    });
  });

  it("derives a deterministic final planning session when no stored value exists", () => {
    const resolved = resolveFinalRoutePlanningSessionId(
      buildRun({
        id: "run-456",
        planningSessionId: "",
      })
    );

    expect(resolved).toEqual({
      planningSessionId: "final:run-456",
      source: "derived_final_run",
    });
  });

  it("throws when planning session cannot be resolved", () => {
    expect(() =>
      resolveFinalRoutePlanningSessionId(
        buildRun({
          id: "",
          planningSessionId: "",
        })
      )
    ).toThrow(FinalRouteRunStateError);
  });
});

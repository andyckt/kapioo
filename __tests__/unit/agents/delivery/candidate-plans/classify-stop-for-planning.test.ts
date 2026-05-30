import {
  inferNorthYorkLean,
  toPlanningStop,
} from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import { buildRoutingStop } from "./test-fixtures";

describe("lib/agents/delivery/candidate-plans/classify-stop-for-planning", () => {
  it("classifies core downtown areas toward DT", () => {
    const stop = toPlanningStop(
      buildRoutingStop({ orderId: "DD-90000001", area: "Downtown Toronto" })
    );

    expect(stop.areaBucket).toBe("core_dt");
    expect(stop.defaultRunLean).toBe("dt");
    expect(stop.planningTags).toContain("core_dt");
  });

  it("classifies uptown areas toward Marco", () => {
    const stop = toPlanningStop(buildRoutingStop({ orderId: "DD-90000002", area: "Markham" }));

    expect(stop.areaBucket).toBe("core_uptown");
    expect(stop.defaultRunLean).toBe("marco");
    expect(stop.planningTags).toContain("core_uptown");
  });

  it("marks North York as flexible and uses address fallback when lat/lng missing", () => {
    const stop = toPlanningStop(
      buildRoutingStop({
        orderId: "DD-90000003",
        area: "North York",
        postalCode: "M2J 2X5",
      })
    );

    expect(stop.areaBucket).toBe("flexible_north_york");
    expect(stop.planningTags).toContain("flexible_north_york");
    expect(stop.planningTags).toContain("address_fallback_lean");
    expect(stop.defaultRunLean).toBe("marco");
  });

  it("uses lat/lng lean tags when coordinates are present", () => {
    const southStop = toPlanningStop(
      buildRoutingStop({
        orderId: "DD-90000004",
        area: "North York",
        lat: 43.65,
        lng: -79.4,
      })
    );
    const northStop = toPlanningStop(
      buildRoutingStop({
        orderId: "DD-90000005",
        area: "North York",
        lat: 43.78,
        lng: -79.32,
      })
    );

    expect(southStop.planningTags).toContain("lat_lng_lean_dt");
    expect(northStop.planningTags).toContain("lat_lng_lean_marco");
    expect(inferNorthYorkLean(southStop)).toBe("dt");
    expect(inferNorthYorkLean(northStop)).toBe("marco");
  });
});

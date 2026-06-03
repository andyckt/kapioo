import { parseRouteOptimizerRunsByDateResponse } from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";
import { RouteOptimizerResponseError } from "@/lib/integrations/route-optimizer/errors";
import {
  emptyRunsByDateResponse,
  oneRunOneStopResponse,
  plannedEtaBasisResponse,
} from "@/__tests__/unit/integrations/route-optimizer/runs-by-date-fixtures";

describe("lib/integrations/route-optimizer/parse-runs-by-date-response", () => {
  it("parses a valid minimal response with no runs", () => {
    const result = parseRouteOptimizerRunsByDateResponse(emptyRunsByDateResponse);

    expect(result.status).toBe("success");
    expect(result.date).toBe("2026-05-31");
    expect(result.count).toBe(0);
    expect(result.runs).toEqual([]);
  });

  it("parses a valid response with one run, one stop, and one customer", () => {
    const result = parseRouteOptimizerRunsByDateResponse(oneRunOneStopResponse);

    expect(result.count).toBe(1);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.run_id).toBe("run-abc123");
    expect(result.runs[0]?.stops).toHaveLength(1);
    expect(result.runs[0]?.customers).toHaveLength(1);
    expect(result.runs[0]?.stops[0]?.customer_name).toBe("Donald-1111");
    expect(result.runs[0]?.future_ro_field).toBe("preserved");
  });

  it("defaults warnings to an empty array when omitted", () => {
    const { warnings: _warnings, ...withoutWarnings } = emptyRunsByDateResponse;
    const result = parseRouteOptimizerRunsByDateResponse(withoutWarnings);

    expect(result.warnings).toEqual([]);
  });

  it("accepts nullable fields on stops and customers", () => {
    const result = parseRouteOptimizerRunsByDateResponse(oneRunOneStopResponse);

    expect(result.runs[0]?.stops[0]?.notes).toBeNull();
    expect(result.runs[0]?.stops[0]?.fixed_stop_position).toBeNull();
    expect(result.runs[0]?.customers[0]?.notes).toBeNull();
  });

  it("keeps order_ids arrays and defaults missing order_ids to []", () => {
    const payload = {
      ...oneRunOneStopResponse,
      runs: [
        {
          ...oneRunOneStopResponse.runs[0],
          stops: [
            {
              sequence: 0,
              order_ids: ["DD-90000001", "DD-90000002"],
            },
          ],
          customers: [
            {
              customer_index: 0,
              name: "NoOrders",
            },
          ],
        },
      ],
    };

    const result = parseRouteOptimizerRunsByDateResponse(payload);

    expect(result.runs[0]?.stops[0]?.order_ids).toEqual(["DD-90000001", "DD-90000002"]);
    expect(result.runs[0]?.customers[0]?.order_ids).toEqual([]);
  });

  it("rejects invalid eta_basis values", () => {
    const payload = {
      ...oneRunOneStopResponse,
      runs: [
        {
          ...oneRunOneStopResponse.runs[0],
          eta_basis: "before_start",
        },
      ],
    };

    expect(() => parseRouteOptimizerRunsByDateResponse(payload)).toThrow(
      RouteOptimizerResponseError
    );
  });

  it("rejects missing required top-level fields", () => {
    expect(() =>
      parseRouteOptimizerRunsByDateResponse({
        status: "success",
        date: "2026-05-31",
      })
    ).toThrow(RouteOptimizerResponseError);
  });

  it("rejects invalid runs shape", () => {
    expect(() =>
      parseRouteOptimizerRunsByDateResponse({
        ...emptyRunsByDateResponse,
        runs: [{}],
      })
    ).toThrow(RouteOptimizerResponseError);
  });

  it("accepts passthrough extra fields without failing", () => {
    const result = parseRouteOptimizerRunsByDateResponse({
      ...emptyRunsByDateResponse,
      extra_top_level: "ok",
    });

    expect(result.extra_top_level).toBe("ok");
  });

  it("accepts planned and post_start eta_basis values", () => {
    const postStart = parseRouteOptimizerRunsByDateResponse(oneRunOneStopResponse);
    const planned = parseRouteOptimizerRunsByDateResponse(plannedEtaBasisResponse);

    expect(postStart.runs[0]?.eta_basis).toBe("post_start");
    expect(postStart.runs[0]?.stops[0]?.eta_basis).toBe("post_start");
    expect(planned.runs[0]?.eta_basis).toBe("planned");
    expect(planned.runs[0]?.stops[0]?.eta_basis).toBe("planned");
  });
});

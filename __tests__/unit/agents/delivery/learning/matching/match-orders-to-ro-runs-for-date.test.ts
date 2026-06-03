import { formatRouteOptimizerCustomerName } from "@/lib/agents/delivery/customer-identity/format-route-optimizer-customer-name";
import { matchOrdersToRouteOptimizerRunsForDate } from "@/lib/agents/delivery/learning/matching/match-orders-to-ro-runs-for-date";

import {
  makeCustomerStop,
  makeLearningOrder,
  makeRoResponse,
  makeRunWithStops,
  makeSyntheticHandoffStop,
  parsedEmptyRunsByDateResponse,
  parsedOneRunOneStopResponse,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

describe("matchOrdersToRouteOptimizerRunsForDate", () => {
  describe("happy paths", () => {
    it("matches by exact order ID", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: parsedOneRunOneStopResponse,
      });

      expect(result.matchedStops).toHaveLength(1);
      expect(result.matchedStops[0]).toMatchObject({
        kapiooOrderId: "DD-90000001",
        roRunId: "run-abc123",
        roStopSequence: 0,
        matchMethod: "order_id",
        matchConfidence: "exact",
        coordinateRef: "ro-stop:run-abc123:0",
      });
      expect(result.unmatchedOrders).toHaveLength(0);
      expect(result.matchCoverage.matchedOrders).toBe(1);
    });

    it("order ID match wins even when names differ", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder({ customerName: "Donald", customerPhone: "4379891111" })],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: "Someone Else-9999",
                order_ids: ["DD-90000001"],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops[0]?.matchMethod).toBe("order_id");
      expect(result.matchedStops[0]?.matchConfidence).toBe("exact");
    });

    it("matches by derived RO customer name Donald-1111 when order IDs missing", () => {
      const formatted = formatRouteOptimizerCustomerName({
        customerName: "Donald",
        phone: "4379891111",
      });

      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-NO-ID",
            customerName: "Donald",
            customerPhone: "4379891111",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: formatted.formattedName,
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(1);
      expect(result.matchedStops[0]?.matchMethod).toBe("derived_route_optimizer_name");
      expect(result.matchedStops[0]?.matchConfidence).toBe("high");
    });

    it("derived name match is case-insensitive through M20A helper", () => {
      const formatted = formatRouteOptimizerCustomerName({
        customerName: "Donald",
        phone: "4379891111",
      });

      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-NO-ID",
            customerName: "Donald",
            customerPhone: "4379891111",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: formatted.formattedName.toUpperCase(),
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(1);
      expect(result.matchedStops[0]?.matchMethod).toBe("derived_route_optimizer_name");
    });

    it("Chinese customer name + phone last4 match works", () => {
      const formatted = formatRouteOptimizerCustomerName({
        customerName: "王 小明",
        phone: "4165551234",
      });

      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-CN-1",
            customerName: "王 小明",
            customerPhone: "4165551234",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: formatted.formattedName,
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(1);
      expect(result.matchedStops[0]?.matchMethod).toBe("derived_route_optimizer_name");
    });
  });

  describe("conservative behavior", () => {
    it("does not auto-match name-only without phone last4", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-NAME-ONLY",
            customerName: "Donald",
            customerPhone: "123",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: "Donald",
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.unmatchedOrders[0]?.reason).toBe("no_route_optimizer_stop_match");
    });

    it("does not auto-match address-only similarity", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-ADDR",
            customerName: "Alice",
            customerPhone: "4165559999",
            formattedAddress: "123 Main St, Toronto",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: "Bob-8888",
                customer_address: "123 Main St, Toronto",
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
    });

    it("does not auto-match phone-only similarity", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-PHONE",
            customerName: "Alice",
            customerPhone: "4379891111",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: "Bob-2222",
                customer_phone: "4379891111",
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
    });

    it("leaves unknown/missing identity unmatched", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder({ orderId: "", customerName: null, customerPhone: null })],
        routeOptimizerResponse: parsedOneRunOneStopResponse,
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.unmatchedOrders[0]?.reason).toBe("missing_customer_identity");
    });
  });

  describe("synthetic stops", () => {
    it("returns synthetic handoff stop as unmatchedRoStop with synthetic_operational_stop", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0),
              makeSyntheticHandoffStop(1),
            ]),
          ],
        }),
      });

      const synthetic = result.unmatchedRoStops.find((stop) => stop.roStopSequence === 1);
      expect(synthetic).toMatchObject({
        isSynthetic: true,
        stopType: "handoff",
        reason: "synthetic_operational_stop",
      });
    });

    it("does not count synthetic stops in totalRoCustomerStops", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0),
              makeSyntheticHandoffStop(1),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.totalRoCustomerStops).toBe(1);
      expect(result.matchCoverage.syntheticUnmatchedStops).toBe(1);
    });

    it("warns on synthetic stop with order_ids and does not auto-match", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder({ orderId: "DD-SYNTH-ONLY" })],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeSyntheticHandoffStop(0, { order_ids: ["DD-SYNTH-ONLY"] }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.warnings.some((warning) => warning.includes("synthetic_stop_has_order_ids"))).toBe(
        true
      );
    });
  });

  describe("conflicts", () => {
    it("flags one order matching multiple RO stops by same order ID", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-90000001"] }),
              makeCustomerStop(1, { order_ids: ["DD-90000001"], customer_name: "Donald-1111" }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.unmatchedOrders[0]).toMatchObject({
        orderId: "DD-90000001",
        reason: "multiple_order_id_matches",
      });
      expect(result.unmatchedOrders[0]?.possibleRoStopRefs).toEqual([
        "ro-stop:run-1:0",
        "ro-stop:run-1:1",
      ]);
      expect(result.warnings.some((warning) => warning.includes("duplicate_order_id_match_conflict"))).toBe(
        true
      );
    });

    it("flags one RO stop matching multiple Admin orders by same order ID", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({ orderId: "DD-90000001" }),
          makeLearningOrder({ orderId: "DD-90000001", customerName: "Donald Copy" }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [makeRunWithStops("run-1", [makeCustomerStop(0)])],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.unmatchedOrders).toHaveLength(2);
      expect(result.unmatchedOrders.every((order) => order.reason === "multiple_order_id_matches")).toBe(
        true
      );
    });

    it("does not auto-pick multiple derived-name candidates", () => {
      const formatted = formatRouteOptimizerCustomerName({
        customerName: "Donald",
        phone: "4379891111",
      });

      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({
            orderId: "DD-DERIVED-1",
            customerName: "Donald",
            customerPhone: "4379891111",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: formatted.formattedName,
                order_ids: [],
              }),
              makeCustomerStop(1, {
                customer_name: formatted.formattedName,
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchedStops).toHaveLength(0);
      expect(result.unmatchedOrders[0]?.reason).toBe("multiple_possible_matches");
      expect(result.unmatchedOrders[0]?.possibleRoStopRefs).toEqual([
        "ro-stop:run-1:0",
        "ro-stop:run-1:1",
      ]);
    });

    it("includes possibleRoStopRefs on conflict orders", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-90000001"] }),
              makeCustomerStop(1, { order_ids: ["DD-90000001"] }),
            ]),
          ],
        }),
      });

      expect(result.unmatchedOrders[0]?.possibleRoStopRefs?.length).toBeGreaterThan(0);
    });
  });

  describe("coverage", () => {
    it("computes totalOrders/matchedOrders/unmatchedOrders correctly", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({ orderId: "DD-1" }),
          makeLearningOrder({ orderId: "DD-2", customerName: "Unknown" }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-1"] }),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.totalOrders).toBe(2);
      expect(result.matchCoverage.matchedOrders).toBe(1);
      expect(result.matchCoverage.unmatchedOrders).toBe(1);
    });

    it("computes totalRoCustomerStops excluding synthetic", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0),
              makeSyntheticHandoffStop(1),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.totalRoCustomerStops).toBe(1);
    });

    it("computes exactMatches and highConfidenceMatches", () => {
      const formatted = formatRouteOptimizerCustomerName({
        customerName: "Alice",
        phone: "4165550100",
      });

      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({ orderId: "DD-EXACT" }),
          makeLearningOrder({
            orderId: "DD-HIGH",
            customerName: "Alice",
            customerPhone: "4165550100",
          }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-EXACT"] }),
              makeCustomerStop(1, {
                customer_name: formatted.formattedName,
                order_ids: [],
              }),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.exactMatches).toBe(1);
      expect(result.matchCoverage.highConfidenceMatches).toBe(1);
    });

    it("handles zero orders", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [],
        routeOptimizerResponse: parsedOneRunOneStopResponse,
      });

      expect(result.matchCoverage.totalOrders).toBe(0);
      expect(result.matchCoverage.matchCoveragePercent).toBe(0);
      expect(result.warnings).toContain("no_orders");
    });

    it("handles no RO runs", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: parsedEmptyRunsByDateResponse,
      });

      expect(result.warnings).toContain("no_route_optimizer_runs");
      expect(result.matchCoverage.totalRoCustomerStops).toBe(0);
    });

    it("handles no RO stops", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [makeRunWithStops("run-1", [])],
        }),
      });

      expect(result.warnings).toContain("no_route_optimizer_stops");
    });

    it("returns low_match_coverage warning when coverage is below threshold", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({ orderId: "DD-1" }),
          makeLearningOrder({ orderId: "DD-2", customerName: "No Match" }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-1"] }),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.matchCoveragePercent).toBe(50);
      expect(result.warnings).not.toContain("low_match_coverage");

      const lowCoverage = matchOrdersToRouteOptimizerRunsForDate({
        orders: [
          makeLearningOrder({ orderId: "DD-1" }),
          makeLearningOrder({ orderId: "DD-2", customerName: "No Match" }),
          makeLearningOrder({ orderId: "DD-3", customerName: "Also No Match" }),
        ],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-1"] }),
            ]),
          ],
        }),
      });

      expect(lowCoverage.matchCoverage.matchCoveragePercent).toBeLessThan(50);
      expect(lowCoverage.warnings).toContain("low_match_coverage");
    });

    it("counts uncertainMatches for conflict orders", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, { order_ids: ["DD-90000001"] }),
              makeCustomerStop(1, { order_ids: ["DD-90000001"] }),
            ]),
          ],
        }),
      });

      expect(result.matchCoverage.uncertainMatches).toBe(1);
    });
  });

  describe("shape and purity", () => {
    it("includes coordinateRef on matchedStops", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [makeLearningOrder()],
        routeOptimizerResponse: parsedOneRunOneStopResponse,
      });

      expect(result.matchedStops[0]?.coordinateRef).toBe("ro-stop:run-abc123:0");
    });

    it("includes stopType and isSynthetic on unmatchedRoStops", () => {
      const result = matchOrdersToRouteOptimizerRunsForDate({
        orders: [],
        routeOptimizerResponse: makeRoResponse({
          runs: [
            makeRunWithStops("run-1", [
              makeCustomerStop(0, {
                customer_name: "",
                order_ids: [],
              }),
              makeSyntheticHandoffStop(1),
            ]),
          ],
        }),
      });

      const realStop = result.unmatchedRoStops.find((stop) => stop.roStopSequence === 0);
      const syntheticStop = result.unmatchedRoStops.find((stop) => stop.roStopSequence === 1);

      expect(realStop).toMatchObject({
        stopType: "customer",
        isSynthetic: false,
        reason: "missing_route_optimizer_identity",
      });
      expect(syntheticStop).toMatchObject({
        stopType: "handoff",
        isSynthetic: true,
        reason: "synthetic_operational_stop",
      });
    });

    it("does not mutate input orders or RO response", () => {
      const orders = [makeLearningOrder()];
      const response = structuredClone(parsedOneRunOneStopResponse);
      const originalOrderId = orders[0]?.orderId;
      const originalStopOrderIds = response.runs[0]?.stops[0]?.order_ids;

      matchOrdersToRouteOptimizerRunsForDate({
        orders,
        routeOptimizerResponse: response,
      });

      expect(orders[0]?.orderId).toBe(originalOrderId);
      expect(response.runs[0]?.stops[0]?.order_ids).toBe(originalStopOrderIds);
    });
  });
});

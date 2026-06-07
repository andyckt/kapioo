import { flattenRouteOptimizerCustomerStops } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";

import {
  makeCustomerStop,
  makeRoResponse,
  makeRunWithStops,
  makeSyntheticHandoffStop,
  parsedOneRunOneStopResponse,
} from "@/__tests__/unit/agents/delivery/learning/matching/matching-fixtures";

describe("flattenRouteOptimizerCustomerStops", () => {
  it("flattens runs and stops with correct field mapping", () => {
    const response = makeRoResponse({
      runs: [
        makeRunWithStops("run-abc123", [makeCustomerStop(0)]),
      ],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);

    expect(flattened).toHaveLength(1);
    expect(flattened[0]).toMatchObject({
      roRunId: "run-abc123",
      roRunDate: "2026-05-31",
      roDriverName: "DT",
      roStopSequence: 0,
      roCustomerIndex: 0,
      roStopType: "customer",
      isSynthetic: false,
      orderIds: ["DD-90000001"],
      customerName: "Donald-1111",
      customerPhone: "4379891111",
      customerAddress: "123 Main St, Toronto",
      lat: 43.65,
      lng: -79.38,
      fixedStopPosition: null,
      isFirstStop: false,
      isEndPoint: false,
    });
  });

  it("marks is_synthetic stops as synthetic", () => {
    const response = makeRoResponse({
      runs: [makeRunWithStops("run-1", [makeSyntheticHandoffStop(1)])],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);

    expect(flattened[0]?.isSynthetic).toBe(true);
    expect(flattened[0]?.roStopType).toBe("handoff");
  });

  it("marks stop_type handoff as synthetic even without is_synthetic flag", () => {
    const response = makeRoResponse({
      runs: [
        makeRunWithStops("run-1", [
          makeCustomerStop(2, {
            is_synthetic: false,
            stop_type: "handoff",
            customer_name: "Handoff",
          }),
        ]),
      ],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);

    expect(flattened[0]?.isSynthetic).toBe(true);
  });

  it("flattens multiple runs and stops in order", () => {
    const response = makeRoResponse({
      count: 2,
      runs: [
        makeRunWithStops("run-a", [makeCustomerStop(0, { order_ids: ["DD-1"] })]),
        makeRunWithStops("run-b", [makeCustomerStop(1, { order_ids: ["DD-2"] })]),
      ],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);

    expect(flattened).toHaveLength(2);
    expect(flattened.map((stop) => stop.roRunId)).toEqual(["run-a", "run-b"]);
  });

  it("does not mutate the input response", () => {
    const response = structuredClone(parsedOneRunOneStopResponse);
    const originalOrderIds = response.runs[0]?.stops[0]?.order_ids;

    flattenRouteOptimizerCustomerStops(response);

    expect(response.runs[0]?.stops[0]?.order_ids).toBe(originalOrderIds);
    expect(response.runs[0]?.stops[0]?.order_ids).toEqual(["DD-90000001"]);
  });

  it("copies order_ids array so flatten output is independent", () => {
    const response = makeRoResponse({
      runs: [makeRunWithStops("run-1", [makeCustomerStop(0)])],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);
    flattened[0]?.orderIds.push("DD-EXTRA");

    expect(response.runs[0]?.stops[0]?.order_ids).toEqual(["DD-90000001"]);
  });

  it("recovers historical RO customer coordinates when the optimized stop omits them", () => {
    const response = makeRoResponse({
      runs: [
        makeRunWithStops(
          "run-1",
          [
            makeCustomerStop(0, {
              customer_name: undefined,
              customer_phone: null,
              customer_address: null,
              lat: null,
              lng: null,
              order_ids: [],
              is_first_stop: undefined,
              is_end_point: undefined,
            }),
          ],
          {
            customers: [
              {
                customer_index: 0,
                name: "Recovered Customer-1111",
                phone: "4379891111",
                address: "Recovered Address, Toronto",
                lat: 43.701,
                lng: -79.401,
                order_ids: ["DD-RECOVERED"],
                fixed_stop_position: 2,
                is_first_stop: true,
                is_end_point: false,
                is_synthetic: false,
                stop_type: "customer",
              },
            ],
          }
        ),
      ],
    });

    const flattened = flattenRouteOptimizerCustomerStops(response);

    expect(flattened[0]).toMatchObject({
      orderIds: ["DD-RECOVERED"],
      customerName: "Recovered Customer-1111",
      customerPhone: "4379891111",
      customerAddress: "Recovered Address, Toronto",
      lat: 43.701,
      lng: -79.401,
      fixedStopPosition: 2,
      isFirstStop: true,
      isEndPoint: false,
    });
  });
});

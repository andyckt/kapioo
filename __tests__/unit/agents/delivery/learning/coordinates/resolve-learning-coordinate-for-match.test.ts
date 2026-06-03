import { resolveLearningCoordinateForMatchedStop } from "@/lib/agents/delivery/learning/coordinates/resolve-learning-coordinate-for-match";

import {
  makeLearningOrder,
  makeMatchedStop,
} from "@/__tests__/unit/agents/delivery/learning/coordinates/coordinate-fixtures";

describe("resolveLearningCoordinateForMatchedStop", () => {
  const matchedStop = makeMatchedStop();

  it("uses RO historical lat/lng first", () => {
    const snapshot = resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: makeLearningOrder({ lat: 43.1, lng: -79.1 }),
      roStop: {
        roRunId: "run-abc123",
        roRunDate: "2026-05-31",
        roDriverName: "DT",
        roStopSequence: 0,
        isSynthetic: false,
        orderIds: ["DD-90000001"],
        lat: 43.65,
        lng: -79.38,
        customerAddress: "123 Main St, Toronto",
      },
    });

    expect(snapshot).toMatchObject({
      lat: 43.65,
      lng: -79.38,
      coordinateSource: "route_optimizer_historical",
      coordinateConfidence: "high",
      refType: "order",
      orderId: "DD-90000001",
      roRunId: "run-abc123",
      roStopSequence: 0,
    });
  });

  it("falls back to Admin order lat/lng", () => {
    const snapshot = resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: makeLearningOrder({ lat: 43.71, lng: -79.39 }),
      roStop: {
        roRunId: "run-abc123",
        roRunDate: "2026-05-31",
        roDriverName: "DT",
        roStopSequence: 0,
        isSynthetic: false,
        orderIds: ["DD-90000001"],
        lat: null,
        lng: null,
        customerAddress: "123 Main St, Toronto",
      },
    });

    expect(snapshot.coordinateSource).toBe("order_data");
    expect(snapshot.coordinateConfidence).toBe("high");
    expect(snapshot.lat).toBe(43.71);
    expect(snapshot.lng).toBe(-79.39);
  });

  it("falls back to address_only when no coords but address exists", () => {
    const snapshot = resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: makeLearningOrder({ lat: null, lng: null, formattedAddress: "123 Main St" }),
      roStop: null,
    });

    expect(snapshot).toMatchObject({
      coordinateSource: "address_only",
      coordinateConfidence: "none",
      lat: null,
      lng: null,
      address: "123 Main St",
    });
    expect(snapshot.warnings).toContain("coordinate_missing_address_only");
  });

  it("uses unavailable when no coords and no address", () => {
    const snapshot = resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: makeLearningOrder({ lat: null, lng: null, formattedAddress: null }),
      roStop: null,
    });

    expect(snapshot.coordinateSource).toBe("unavailable");
    expect(snapshot.warnings).toContain("coordinate_unavailable");
  });

  it("produces stable coordinateRef and order/ro fields", () => {
    const snapshot = resolveLearningCoordinateForMatchedStop({
      matchedStop,
      order: makeLearningOrder(),
      roStop: {
        roRunId: "run-abc123",
        roRunDate: "2026-05-31",
        roDriverName: "DT",
        roStopSequence: 0,
        isSynthetic: false,
        orderIds: ["DD-90000001"],
        lat: 43.65,
        lng: -79.38,
        customerAddress: "123 Main St, Toronto",
      },
    });

    expect(snapshot.ref).toBe("ro-stop:run-abc123:0");
    expect(snapshot.orderId).toBe("DD-90000001");
    expect(snapshot.roRunId).toBe("run-abc123");
    expect(snapshot.roStopSequence).toBe(0);
  });
});

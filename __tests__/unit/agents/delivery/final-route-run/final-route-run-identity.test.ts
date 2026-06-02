import { buildFinalRouteCreatePayloads } from "@/lib/agents/delivery/final-route-run/build-final-route-create-payloads";
import {
  buildFinalRouteExternalId,
  buildFinalRouteGenerationSuffix,
  buildFinalRouteIdentity,
  buildFinalRouteIdempotencyKey,
} from "@/lib/agents/delivery/final-route-run/final-route-run-identity";
import { getDefaultDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import type { DeliveryAgentCandidatePlanPreview } from "@/lib/contracts/delivery-agent";

const baseIdentity = {
  deliveryDate: "2026-06-09",
  deliveryAgentRunId: "run-123",
  profileId: "daily-profile",
  selectedCandidateId: "candidate:selected",
  runSlot: "A",
};

function routingStop(orderId: string, address: string): RoutingStop {
  return {
    orderId,
    mongoId: orderId,
    customerName: orderId,
    customerPhone: "416-555-0100",
    area: "North York",
    formattedAddress: address,
    totalMealQuantity: 1,
    warnings: [],
    routeOptimizer: {
      name: orderId,
      phone: "416-555-0100",
      address,
      notes: "",
      order_ids: [orderId],
    },
  } as unknown as RoutingStop;
}

const approvedCandidate = {
  candidateId: "candidate:selected",
  runs: [
    {
      runSlot: "A",
      driverName: "Provider",
      stopCount: 1,
      optimizedStopCount: 1,
      optimizedStops: [{ sequence: 1, orderIds: ["DD-1"], address: "1 Provider St" }],
      previewStatus: "previewed",
      repairActionsApplied: [],
    },
  ],
  handoffPlan: {
    providerRunSlot: "A",
    receiverRunSlot: "B",
    handoffSkipped: true,
    selectedMeetup: null,
  },
  candidateRepairSummary: {
    repairAttempted: false,
    repairSucceeded: false,
    issuesDetected: [],
    repairActionsApplied: [],
    warnings: [],
  },
} as unknown as DeliveryAgentCandidatePlanPreview;

describe("buildFinalRouteGenerationSuffix", () => {
  it("returns no suffix for undefined, null-equivalent, and generation 1", () => {
    expect(buildFinalRouteGenerationSuffix(undefined)).toBe("");
    expect(buildFinalRouteGenerationSuffix(1)).toBe("");
  });

  it("returns :v2 and :v3 for later generations", () => {
    expect(buildFinalRouteGenerationSuffix(2)).toBe(":v2");
    expect(buildFinalRouteGenerationSuffix(3)).toBe(":v3");
  });
});

describe("buildFinalRouteExternalId", () => {
  it("matches generation 1 format without suffix", () => {
    expect(buildFinalRouteExternalId({ ...baseIdentity, finalRouteGeneration: 1 })).toBe(
      "kapioo-final-run:2026-06-09:run-123:candidate:selected:A"
    );
  });

  it("includes generation suffix for generation 2+", () => {
    expect(buildFinalRouteExternalId({ ...baseIdentity, finalRouteGeneration: 2 })).toBe(
      "kapioo-final-run:2026-06-09:run-123:candidate:selected:A:v2"
    );
  });

  it("returns stable output for the same inputs", () => {
    const first = buildFinalRouteExternalId(baseIdentity);
    const second = buildFinalRouteExternalId(baseIdentity);

    expect(first).toBe(second);
    expect(first).toBe("kapioo-final-run:2026-06-09:run-123:candidate:selected:A");
  });
});

describe("buildFinalRouteIdempotencyKey", () => {
  it("matches generation 1 format without suffix", () => {
    expect(buildFinalRouteIdempotencyKey({ ...baseIdentity, finalRouteGeneration: 1 })).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A"
    );
  });

  it("includes generation suffix for generation 2+", () => {
    expect(buildFinalRouteIdempotencyKey({ ...baseIdentity, finalRouteGeneration: 2 })).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A:v2"
    );
  });

  it("returns stable output for the same inputs", () => {
    const first = buildFinalRouteIdempotencyKey(baseIdentity);
    const second = buildFinalRouteIdempotencyKey(baseIdentity);

    expect(first).toBe(second);
    expect(first).toBe(
      "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A"
    );
  });
});

describe("buildFinalRouteIdentity", () => {
  it("returns externalId, idempotencyKey, and generationSuffix together", () => {
    expect(buildFinalRouteIdentity({ ...baseIdentity, finalRouteGeneration: 2 })).toEqual({
      externalId: "kapioo-final-run:2026-06-09:run-123:candidate:selected:A:v2",
      idempotencyKey:
        "daily-delivery-agent:2026-06-09:daily-profile:final:candidate:selected:A:v2",
      generationSuffix: ":v2",
    });
  });
});

describe("buildFinalRouteCreatePayloads identity alignment", () => {
  it("uses the same generation 1 keys as the shared identity helper", () => {
    const payload = buildFinalRouteCreatePayloads({
      candidate: approvedCandidate,
      context: {
        deliveryDate: baseIdentity.deliveryDate,
        deliveryAgentRunId: baseIdentity.deliveryAgentRunId,
        profileId: baseIdentity.profileId,
        selectedCandidateId: baseIdentity.selectedCandidateId,
        planningSessionId: "final:run-123",
        kitchenAddress: "Kitchen",
        profile: getDefaultDeliveryPlanningProfile(),
        routingStopByOrderId: new Map([["DD-1", routingStop("DD-1", "1 Provider St")]]),
        finalRouteGeneration: 1,
      },
    });

    const identity = buildFinalRouteIdentity({ ...baseIdentity, finalRouteGeneration: 1 });

    expect(payload.runs[0]?.external_id).toBe(identity.externalId);
    expect(payload.runs[0]?.idempotency_key).toBe(identity.idempotencyKey);
  });

  it("uses different keys for generation 2 than generation 1", () => {
    const generationOne = buildFinalRouteIdentity({ ...baseIdentity, finalRouteGeneration: 1 });
    const generationTwo = buildFinalRouteIdentity({ ...baseIdentity, finalRouteGeneration: 2 });

    expect(generationTwo.externalId).not.toBe(generationOne.externalId);
    expect(generationTwo.idempotencyKey).not.toBe(generationOne.idempotencyKey);
    expect(generationTwo.generationSuffix).toBe(":v2");
  });
});

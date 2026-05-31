import { describe, expect, it } from "vitest";

import { interpretDonaldFeedback } from "@/lib/agents/delivery/feedback/interpret-donald-feedback";
import { getDeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/get-profile";
import { mapOrderToRoutingStop } from "@/lib/agents/delivery/map-order-to-routing-stop";
import { createRoutingTestOrder } from "../test-fixtures";

function buildNamedStop(input: {
  orderId: string;
  customerName: string;
  streetAddress: string;
  area?: string;
}) {
  const order = createRoutingTestOrder({
    orderId: input.orderId,
    customer: {
      name: input.customerName,
      email: "test@example.com",
      phone: "416-555-0100",
      area: input.area ?? "North York",
      specialInstructions: "",
      hasAdminOverride: false,
    },
    deliveryAddress: {
      unitNumber: "",
      streetAddress: input.streetAddress,
      city: "Toronto",
      province: "ON",
      postalCode: "M2N 5N8",
      country: "Canada",
      buzzCode: "",
      formatted: `${input.streetAddress}, ${input.area ?? "North York"} M2N 5N8, Canada`,
    },
  });

  return mapOrderToRoutingStop(order, "2026-06-09");
}

describe("interpretDonaldFeedback", () => {
  const profile = getDeliveryPlanningProfile("daily-v1-current-dt-marco-self");
  const stops = [
    buildNamedStop({
      orderId: "DD-LYNN",
      customerName: "Lynn Liu",
      streetAddress: "100 Sheppard Ave E",
    }),
    buildNamedStop({
      orderId: "DD-ROSHA",
      customerName: "Rosha",
      streetAddress: "200 Finch Ave W",
    }),
    buildNamedStop({
      orderId: "DD-MEETUP",
      customerName: "Anchor Customer",
      streetAddress: "5180 Yonge St",
    }),
  ];

  it("parses 5180 Yonge St into preferred meet-up address and order id", () => {
    const result = interpretDonaldFeedback({
      feedbackText: "Use 5180 Yonge St for the meet-up instead.",
      feedbackTags: ["meetup_too_far_for_provider"],
      routingStops: stops,
      profile,
      sourceFeedbackReviewedAt: "2026-06-09T12:00:00.000Z",
    });

    expect(result.preferredMeetupAddress).toMatch(/5180 Yonge St/i);
    expect(result.preferredMeetupOrderId).toBe("DD-MEETUP");
    expect(result.penalties).toContain("provider_meetup_too_far");
  });

  it("matches Lynn Liu and Rosha to driver assignments on DT", () => {
    const result = interpretDonaldFeedback({
      feedbackText:
        "Move Lynn Liu and Rosha to DT before the meet-up. Meet at 5180 Yonge St.",
      feedbackTags: ["wrong_order_split"],
      routingStops: stops,
      profile,
      sourceFeedbackReviewedAt: "2026-06-09T12:00:00.000Z",
    });

    expect(result.preferredDriverAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: "DD-LYNN",
          customerName: "Lynn Liu",
          preferredRunSlot: "A",
          timing: "before_meetup",
        }),
        expect.objectContaining({
          orderId: "DD-ROSHA",
          customerName: "Rosha",
          preferredRunSlot: "A",
          timing: "before_meetup",
        }),
      ])
    );
  });

  it("adds warnings for unmatched customer names", () => {
    const result = interpretDonaldFeedback({
      feedbackText: "Put Zara Unknown on DT.",
      feedbackTags: ["wrong_order_split"],
      routingStops: stops,
      profile,
      sourceFeedbackReviewedAt: "2026-06-09T12:00:00.000Z",
    });

    expect(result.unmatchedCustomerNames).toContain("Zara Unknown");
    expect(result.warnings.some((warning) => warning.includes("Zara Unknown"))).toBe(true);
  });
});

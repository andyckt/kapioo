import {
  FinalRoutePayloadValidationError,
  validateFinalRouteRunPayload,
} from "@/lib/agents/delivery/final-route-run/validate-final-route-run-payload";
import { SYNTHETIC_MEETUP_STOP_NAME } from "@/lib/agents/delivery/candidate-plans/synthetic-meetup-stop";
import type { RouteOptimizerCustomerInput } from "@/lib/integrations/route-optimizer/types";

describe("validateFinalRouteRunPayload", () => {
  it("accepts customers with phone, name, and address", () => {
    expect(() =>
      validateFinalRouteRunPayload({
        runSlot: "A",
        request: {
          run: {
            run_date: "2026-06-09",
            driver_name: "DT",
            start_location: "Kitchen",
            start_time: "10:00",
          },
          customers: [
            {
              name: "Alice",
              phone: "416-555-0100",
              address: "123 Main St",
              order_ids: ["DD-1"],
            },
          ],
        },
      })
    ).not.toThrow();
  });

  it("accepts synthetic meetup stops with operational phone and synthetic order id", () => {
    expect(() =>
      validateFinalRouteRunPayload({
        runSlot: "A",
        request: {
          run: {
            run_date: "2026-06-09",
            driver_name: "DT",
            start_location: "Kitchen",
            start_time: "10:00",
          },
          customers: [
            {
              name: SYNTHETIC_MEETUP_STOP_NAME,
              phone: "416-555-0200",
              address: "4000 Yonge St",
              order_ids: ["kapioo-handoff-meetup:2026-06-09:A"],
              is_synthetic: true,
              stop_type: "handoff",
            },
          ],
        },
      })
    ).not.toThrow();
  });

  it("blocks missing phone with route, index, and order details", () => {
    expect(() =>
      validateFinalRouteRunPayload({
        runSlot: "A",
        request: {
          run: {
            run_date: "2026-06-09",
            driver_name: "DT",
            start_location: "Kitchen",
            start_time: "10:00",
          },
          customers: [
            ...Array.from({ length: 13 }, (_, index) => ({
              name: `Customer ${index + 1}`,
              phone: "416-555-0100",
              address: `${index + 1} Main St`,
              order_ids: [`DD-${index + 1}`],
            })),
            {
              name: SYNTHETIC_MEETUP_STOP_NAME,
              phone: "",
              address: "4000 Yonge St",
              order_ids: ["kapioo-handoff-meetup:2026-06-09:A"],
              is_synthetic: true,
              stop_type: "handoff",
            } satisfies RouteOptimizerCustomerInput,
          ],
        },
      })
    ).toThrow(FinalRoutePayloadValidationError);

    try {
      validateFinalRouteRunPayload({
        runSlot: "A",
        request: {
          run: {
            run_date: "2026-06-09",
            driver_name: "DT",
            start_location: "Kitchen",
            start_time: "10:00",
          },
          customers: [
            ...Array.from({ length: 13 }, (_, index) => ({
              name: `Customer ${index + 1}`,
              phone: "416-555-0100",
              address: `${index + 1} Main St`,
              order_ids: [`DD-${index + 1}`],
            })),
            {
              name: SYNTHETIC_MEETUP_STOP_NAME,
              phone: "",
              address: "4000 Yonge St",
              order_ids: ["kapioo-handoff-meetup:2026-06-09:A"],
              is_synthetic: true,
              stop_type: "handoff",
            } satisfies RouteOptimizerCustomerInput,
          ],
        },
      });
    } catch (error) {
      expect(error).toMatchObject({
        issue: {
          driverName: "DT",
          customerIndex: 13,
          field: "phone",
          customerName: SYNTHETIC_MEETUP_STOP_NAME,
          address: "4000 Yonge St",
          isSynthetic: true,
        },
        message: expect.stringContaining("synthetic meet-up/handoff stop"),
      });
    }
  });

  it("rejects synthetic meetup stops that reference real delivery order ids", () => {
    expect(() =>
      validateFinalRouteRunPayload({
        runSlot: "A",
        request: {
          run: {
            run_date: "2026-06-09",
            driver_name: "DT",
            start_location: "Kitchen",
            start_time: "10:00",
          },
          customers: [
            {
              name: SYNTHETIC_MEETUP_STOP_NAME,
              phone: "416-555-0200",
              address: "4000 Yonge St",
              order_ids: ["DD-MIMO"],
              is_synthetic: true,
              stop_type: "handoff",
            },
          ],
        },
      })
    ).toThrow(/synthetic order id/);
  });
});

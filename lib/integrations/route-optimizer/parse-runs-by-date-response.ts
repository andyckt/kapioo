import { z } from "zod";

import {
  RouteOptimizerResponseError,
} from "@/lib/integrations/route-optimizer/errors";
import { routeOptimizerHistoricalEtaBasisSchema } from "@/lib/integrations/route-optimizer/runs-by-date-types";
import { ROUTE_OPTIMIZER_PATHS } from "@/lib/integrations/route-optimizer/types";

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();
const stringArrayDefault = z.array(z.string()).default([]);

const routeOptimizerHistoricalRouteSummarySchema = z
  .object({
    total_distance_km: nullableNumber,
    total_duration_minutes: nullableNumber,
  })
  .passthrough();

const routeOptimizerHistoricalOptimizationControlsSchema = z
  .object({
    start_location: nullableString,
    end_location: nullableString,
  })
  .passthrough();

const routeOptimizerHistoricalStopSchema = z
  .object({
    sequence: z.number(),
    customer_index: z.number().optional(),
    customer_name: z.string().optional(),
    customer_phone: nullableString,
    customer_address: nullableString,
    notes: nullableString,
    lat: nullableNumber,
    lng: nullableNumber,
    order_ids: stringArrayDefault,
    is_synthetic: z.boolean().optional(),
    stop_type: nullableString,
    is_first_stop: z.boolean().optional(),
    is_end_point: z.boolean().optional(),
    fixed_stop_position: z.number().nullable().optional(),
    eta: nullableString,
    arrival_time: nullableString,
    eta_basis: routeOptimizerHistoricalEtaBasisSchema.optional(),
    completed: z.boolean().optional(),
    completed_at: nullableString,
    status: nullableString,
  })
  .passthrough();

const routeOptimizerHistoricalCustomerSchema = z
  .object({
    customer_index: z.number().optional(),
    name: z.string().optional(),
    phone: nullableString,
    address: nullableString,
    notes: nullableString,
    lat: nullableNumber,
    lng: nullableNumber,
    order_ids: stringArrayDefault,
    fixed_stop_position: z.number().nullable().optional(),
    is_first_stop: z.boolean().optional(),
    is_end_point: z.boolean().optional(),
    is_synthetic: z.boolean().optional(),
    stop_type: nullableString,
  })
  .passthrough();

const routeOptimizerHistoricalRunSchema = z
  .object({
    run_id: z.string(),
    run_date: z.string(),
    driver_name: z.string(),
    status: z.string(),
    start_location: nullableString,
    end_location: nullableString,
    start_time: nullableString,
    actual_start_time: nullableString,
    run_completed_at: nullableString,
    travel_mode: nullableString,
    planning_session_id: nullableString,
    external_id: nullableString,
    idempotency_key: nullableString,
    created_by_integration: nullableString,
    created_at: nullableString,
    updated_at: nullableString,
    eta_basis: routeOptimizerHistoricalEtaBasisSchema.optional(),
    route: routeOptimizerHistoricalRouteSummarySchema.nullable().optional(),
    optimization_controls: routeOptimizerHistoricalOptimizationControlsSchema
      .nullable()
      .optional(),
    stops: z.array(routeOptimizerHistoricalStopSchema).default([]),
    customers: z.array(routeOptimizerHistoricalCustomerSchema).default([]),
  })
  .passthrough();

const routeOptimizerRunsByDateMetadataSchema = z
  .object({
    queried_at: nullableString,
    filters_applied: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .optional();

export const routeOptimizerRunsByDateResponseSchema = z
  .object({
    status: z.string(),
    date: z.string(),
    timezone_note: nullableString,
    count: z.number(),
    runs: z.array(routeOptimizerHistoricalRunSchema),
    metadata: routeOptimizerRunsByDateMetadataSchema,
    warnings: z.array(z.string()).default([]),
  })
  .passthrough();

export type RouteOptimizerHistoricalRouteSummary = z.infer<
  typeof routeOptimizerHistoricalRouteSummarySchema
>;
export type RouteOptimizerHistoricalOptimizationControls = z.infer<
  typeof routeOptimizerHistoricalOptimizationControlsSchema
>;
export type RouteOptimizerHistoricalStop = z.infer<typeof routeOptimizerHistoricalStopSchema>;
export type RouteOptimizerHistoricalCustomer = z.infer<
  typeof routeOptimizerHistoricalCustomerSchema
>;
export type RouteOptimizerHistoricalRun = z.infer<typeof routeOptimizerHistoricalRunSchema>;
export type RouteOptimizerRunsByDateMetadata = z.infer<
  typeof routeOptimizerRunsByDateMetadataSchema
>;
export type RouteOptimizerRunsByDateResponse = z.infer<
  typeof routeOptimizerRunsByDateResponseSchema
>;

function truncateValidationIssues(issues: z.ZodIssue[], maxLength = 300): string {
  const summary = issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

  if (summary.length <= maxLength) {
    return summary;
  }

  return `${summary.slice(0, maxLength)}…`;
}

export function parseRouteOptimizerRunsByDateResponse(
  body: unknown
): RouteOptimizerRunsByDateResponse {
  const parsed = routeOptimizerRunsByDateResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new RouteOptimizerResponseError(
      `Route Optimizer runs-by-date response failed validation: ${truncateValidationIssues(parsed.error.issues)}`,
      {
        path: ROUTE_OPTIMIZER_PATHS.runsByDate,
        body,
      }
    );
  }

  return parsed.data;
}

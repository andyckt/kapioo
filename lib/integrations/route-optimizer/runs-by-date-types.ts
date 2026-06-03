/**
 * Route Optimizer historical runs-by-date response DTOs.
 *
 * RO `run_date` is the Kapioo business delivery date (not upload/creation time).
 * `eta_basis` indicates whether ETAs are post_start, planned, or unknown.
 * This contract is read-only and used for historical learning (M20C+).
 */
import { z } from "zod";

export const ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES = [
  "post_start",
  "planned",
  "unknown",
] as const;

export type RouteOptimizerHistoricalEtaBasis =
  (typeof ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES)[number];

export const routeOptimizerHistoricalEtaBasisSchema = z.enum(
  ROUTE_OPTIMIZER_HISTORICAL_ETA_BASIS_VALUES
);

export type {
  RouteOptimizerHistoricalCustomer,
  RouteOptimizerHistoricalOptimizationControls,
  RouteOptimizerHistoricalRouteSummary,
  RouteOptimizerHistoricalRun,
  RouteOptimizerHistoricalStop,
  RouteOptimizerRunsByDateMetadata,
  RouteOptimizerRunsByDateResponse,
} from "@/lib/integrations/route-optimizer/parse-runs-by-date-response";

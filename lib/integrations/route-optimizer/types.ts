export const ROUTE_OPTIMIZER_PATHS = {
  optimizePreview: "/api/integrations/runs/optimize-preview",
  createAndOptimize: "/api/integrations/runs/create-and-optimize",
  batchCreateAndOptimize: "/api/integrations/runs/batch-create-and-optimize",
} as const;

export type RouteOptimizerLocation = {
  address?: string;
  lat?: number;
  lng?: number;
};

export type RouteOptimizerRunInput = {
  run_date: string;
  driver_name: string;
  start_location: RouteOptimizerLocation | string;
  end_location?: RouteOptimizerLocation | string;
  start_time: string;
  travel_mode?: string;
};

export type RouteOptimizerCustomerInput = {
  name: string;
  phone?: string;
  address: string;
  notes?: string;
  lat?: number;
  lng?: number;
  geocode_status?: string;
  order_ids?: string[];
  is_first_stop?: boolean;
  is_end_point?: boolean;
  fixed_stop_position?: number;
  is_synthetic?: boolean;
  stop_type?: string;
  service_time_minutes?: number;
};

export type RouteOptimizerIntegrationRequest = {
  planning_session_id?: string;
  idempotency_key?: string;
  external_id?: string;
  created_by_integration?: string;
  run: RouteOptimizerRunInput;
  customers: RouteOptimizerCustomerInput[];
};

export type RouteOptimizerPreviewRequest = RouteOptimizerIntegrationRequest;
export type RouteOptimizerCreateRequest = RouteOptimizerIntegrationRequest;

export type RouteOptimizerBatchCreateRequest = {
  runs: RouteOptimizerIntegrationRequest[];
};

export type RouteOptimizerOptimizedStop = {
  customer_index?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  name?: string;
  address?: string;
  eta?: string;
  arrival_time?: string;
  order_ids?: string[];
  sequence?: number;
  [key: string]: unknown;
};

export type RouteOptimizerOptimizedRoute = {
  total_duration_minutes?: number;
  total_distance_km?: number;
  stops?: RouteOptimizerOptimizedStop[];
  [key: string]: unknown;
};

export type RouteOptimizerRunResult = {
  preview?: boolean;
  persisted?: boolean;
  run_id?: string;
  status?: string;
  planning_session_id?: string;
  external_id?: string;
  idempotency_key?: string;
  details_link?: string;
  driver_link?: string;
  total_duration_minutes?: number;
  total_distance_km?: number;
  estimated_finish_time?: string;
  optimized_route?: RouteOptimizerOptimizedRoute | RouteOptimizerOptimizedStop[] | null;
  geocode_failures?: unknown[];
  validation_errors?: unknown[];
  warnings?: unknown[];
  [key: string]: unknown;
};

export type RouteOptimizerBatchResult = {
  status?: string;
  results?: RouteOptimizerRunResult[];
  [key: string]: unknown;
};

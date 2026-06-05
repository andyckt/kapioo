export * from "@/lib/contracts/delivery-agent-learning";
export { buildDeliveryAgentLearningCaseKey } from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-key";
export { HISTORICAL_LEARNING_ORDER_STATUSES } from "@/lib/agents/delivery/learning/historical-cases/historical-learning-statuses";
export { mapOrderToLearningOrderSnapshot } from "@/lib/agents/delivery/learning/historical-cases/map-order-to-learning-snapshot";
export { getHistoricalOrdersForLearning } from "@/lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning";
export { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
export {
  buildAndUpsertDeliveryAgentLearningCaseForDate,
  buildDeliveryAgentLearningCaseFromHistoricalData,
  upsertDeliveryAgentLearningCase,
  type BuildAndUpsertDeliveryAgentLearningCaseForDateInput,
  type BuildAndUpsertDeliveryAgentLearningCaseForDateResult,
  type BuildDeliveryAgentLearningCaseFromHistoricalDataInput,
} from "@/lib/agents/delivery/learning/historical-cases/build-learning-case-for-date";
export {
  backfillDeliveryAgentLearningCaseForDate,
  backfillDeliveryAgentLearningCasesForDateRange,
  buildLearningBackfillDateList,
  type BackfillDeliveryAgentLearningCasesForDateRangeInput,
  type DeliveryAgentLearningBackfillDateResult,
  type DeliveryAgentLearningBackfillDateStatus,
  type DeliveryAgentLearningBackfillSummary,
} from "@/lib/agents/delivery/learning/backfill/backfill-learning-cases-for-date-range";
export {
  getDeliveryLearningBackfillCliUsage,
  parseDeliveryLearningBackfillCliArgs,
  type DeliveryAgentLearningBackfillCliArgs,
} from "@/lib/agents/delivery/learning/backfill/backfill-cli-args";
export { flattenRouteOptimizerCustomerStops } from "@/lib/agents/delivery/learning/matching/flatten-route-optimizer-customer-stops";
export { matchOrdersToRouteOptimizerRunsForDate } from "@/lib/agents/delivery/learning/matching/match-orders-to-ro-runs-for-date";
export type {
  DeliveryAgentHistoricalOrderStopMatchingResult,
  FlattenedRouteOptimizerCustomerStop,
} from "@/lib/agents/delivery/learning/matching/types";
export { isFiniteCoordinate, hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
export { resolveLearningCoordinateForMatchedStop } from "@/lib/agents/delivery/learning/coordinates/resolve-learning-coordinate-for-match";
export { buildLearningCoordinateSnapshots } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-snapshots";
export { buildLearningCoordinateCoverage } from "@/lib/agents/delivery/learning/coordinates/build-learning-coordinate-coverage";
export { computeDeliveryGeoFeatures } from "@/lib/agents/delivery/learning/geo-features/compute-delivery-geo-features";
export { haversineDistanceKm } from "@/lib/agents/delivery/learning/geo-features/distance";
export type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";
export { extractDeliveryAgentLearningStopControlFeatures } from "@/lib/agents/delivery/learning/stop-controls/extract-stop-control-features";
export { extractDeliveryAgentLearningRouteShapeFeatures } from "@/lib/agents/delivery/learning/route-shape/extract-route-shape-features";
export { extractDeliveryAgentLearningOutcomeFeatures } from "@/lib/agents/delivery/learning/outcome/extract-outcome-features";
export { extractDeliveryAgentLearningResourceProfileFeatures } from "@/lib/agents/delivery/learning/resource-profile/extract-resource-profile-features";
export {
  buildHistoricalRetrievalTargetFromLearningCase,
  retrieveSimilarHistoricalLearningCases,
  scoreHistoricalLearningCaseSimilarity,
  type RetrieveSimilarHistoricalLearningCasesInput,
} from "@/lib/agents/delivery/learning/retrieval/historical-similarity";

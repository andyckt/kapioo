import type { DeliveryAgentCoordinateCoverageSummary } from "@/lib/contracts/delivery-agent";

const SOURCE_LABELS: Record<
  keyof NonNullable<DeliveryAgentCoordinateCoverageSummary["sourceBreakdown"]>,
  string
> = {
  orderData: "Order data",
  cache: "Cache",
  routeOptimizerGeocode: "Route Optimizer geocode",
  fallbackUnavailable: "Fallback unavailable",
};

export function CoordinateCoverageBanner({
  coverage,
}: {
  coverage: DeliveryAgentCoordinateCoverageSummary;
}) {
  const confidenceLabel =
    coverage.recommendationConfidence.charAt(0).toUpperCase() +
    coverage.recommendationConfidence.slice(1);

  const toneClass =
    coverage.recommendationConfidence === "high"
      ? "border-green-200 bg-green-50 text-green-900"
      : coverage.recommendationConfidence === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-destructive/30 bg-destructive/10 text-destructive";

  const breakdown = coverage.sourceBreakdown;

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>
      <p className="font-medium">Recommendation confidence: {confidenceLabel}</p>
      <p>
        Coordinates: {coverage.stopsWithCoordinates}/{coverage.totalValidStops} stops
        {coverage.stopsFallback > 0 ? ` · ${coverage.stopsFallback} without coordinates` : ""}
        {coverage.stopsGeocodeFailed > 0 ? ` · ${coverage.stopsGeocodeFailed} geocode failed` : ""}
      </p>
      {breakdown && (
        <p className="mt-1 text-xs opacity-90">
          Sources: {SOURCE_LABELS.orderData} {breakdown.orderData} · {SOURCE_LABELS.cache}{" "}
          {breakdown.cache} · {SOURCE_LABELS.routeOptimizerGeocode}{" "}
          {breakdown.routeOptimizerGeocode} · {SOURCE_LABELS.fallbackUnavailable}{" "}
          {breakdown.fallbackUnavailable}
        </p>
      )}
      {(coverage.alerts ?? []).map((alert) => (
        <p key={alert.code} className="mt-2 font-medium">
          {alert.message}
        </p>
      ))}
      {coverage.recommendationConfidence !== "high" && coverage.stopsFallback > 0 && (
        <p className="mt-2">
          Recommendation is lower confidence because {coverage.stopsFallback} stop(s) do not have
          coordinates.
        </p>
      )}
    </div>
  );
}

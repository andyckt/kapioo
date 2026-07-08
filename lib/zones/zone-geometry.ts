/**
 * Delivery zone polygon geometries — keyed by ServiceArea.id.
 *
 * DESIGN NOTES
 * ============
 * This file is intentionally SEPARATE from service-areas.ts so that
 * label/mode flags (which are imported by client-side copy/constants)
 * do NOT bundle raw coordinate arrays into the browser.
 *
 * Only the server-side serviceability decision (resolveServiceability) and
 * the audit script import from here; all other consumers import from
 * service-areas.ts only.
 *
 * HOW TO ADD A POLYGON
 * ====================
 * 1. Draw the zone at https://geojson.io (or export from FreeMapTools / QGIS).
 * 2. Simplify vertices (mapshaper.org → Simplify → keep ~50–200 vertices).
 * 3. Verify coordinates are in [longitude, latitude] order (GeoJSON spec).
 * 4. Add or update the entry for the area below.
 * 5. Flip the area's `daily`/`weekly` coverage to `{ mode: "polygon" }` in
 *    service-areas.ts.
 * 6. Run `npm test` — the registry-validity test will catch unclosed rings,
 *    out-of-bounds coordinates, or lat/lng axis swaps before they hit production.
 * 7. Run scripts/audit-zone-impact.ts BEFORE deploying to confirm no active
 *    customers fall outside the new polygon.
 *
 * COORDINATE ORDER
 * ================
 * GeoJSON is [longitude, latitude] — the OPPOSITE of Google Maps (lat, lng).
 * Always use `pointFromLatLng(lat, lng)` from lib/zones/geo.ts to build
 * test points; never pass raw lat/lng to turf directly.
 */

import type { PolygonGeometry } from "./geo";

export type ZoneGeometryEntry = {
  /** Polygon used when checking daily delivery eligibility. */
  daily?: PolygonGeometry;
  /** Polygon used when checking weekly delivery eligibility. */
  weekly?: PolygonGeometry;
};

/**
 * Map from ServiceArea.id → per-service polygon geometry.
 *
 * An area's polygon is only consulted when the corresponding ServiceCoverage
 * has `mode: "polygon"`. Areas without an entry here can still use
 * `mode: "all"`, `mode: "include"` (FSA), or `mode: "none"`.
 *
 * Add entries below as you draw and verify each zone.
 */
export const ZONE_GEOMETRIES: Record<string, ZoneGeometryEntry> = {
  // ──────────────────────────────────────────────────────────────────
  // Paste polygon geometries here as you draw them.
  //
  // Example shape (replace with real coordinates from geojson.io):
  //
  // "richmond-hill": {
  //   daily: {
  //     type: "Polygon",
  //     coordinates: [
  //       [
  //         [-79.47, 43.87],   // [lng, lat]
  //         [-79.38, 43.87],
  //         [-79.38, 43.93],
  //         [-79.47, 43.93],
  //         [-79.47, 43.87],   // must repeat first point to close the ring
  //       ],
  //     ],
  //   },
  // },
  // ──────────────────────────────────────────────────────────────────
};

/**
 * Look up the geometry for a given area id and service.
 * Returns undefined when no polygon has been drawn for that combination.
 */
export function getZoneGeometry(
  areaId: string,
  service: "daily" | "weekly"
): PolygonGeometry | undefined {
  return ZONE_GEOMETRIES[areaId]?.[service];
}

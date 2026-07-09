/**
 * Global daily delivery zone — the single source of truth for daily eligibility.
 *
 * HOW TO UPDATE (before launch):
 * ================================
 * 1. Draw your full delivery zone on https://geojson.io
 * 2. Export as GeoJSON — copy the geometry object (type + coordinates only)
 * 3. Replace the entire DAILY_DELIVERY_ZONE value below
 * 4. Run: npx tsx scripts/audit-zone-impact.ts --service daily
 *    Review and handle any customers outside the new zone
 * 5. Run: npm test  (the registry-validity test catches bad pastes)
 * 6. Commit and deploy
 *
 * COORDINATE ORDER:
 * GeoJSON uses [longitude, latitude] — the OPPOSITE of Google Maps.
 * geojson.io exports in the correct order automatically.
 *
 * USE MultiPolygon when your delivery area has 2+ disconnected blobs.
 * Use Polygon when it is one continuous region.
 */

import type { PolygonGeometry } from "./geo";

/**
 * INTERIM CONTENT — for testing only.
 * Replace with the final giant polygon from geojson.io before launch.
 *
 * Currently contains the two separately-drawn zones (Downtown Toronto + Richmond Hill)
 * as a MultiPolygon so all existing tests pass until you provide the single polygon.
 */
export const DAILY_DELIVERY_ZONE: PolygonGeometry = {
  type: "MultiPolygon",
  coordinates: [
    // Downtown Toronto
    [
      [
        [-79.4420403, 43.6781067],
        [-79.3865054, 43.6894032],
        [-79.354735, 43.6663999],
        [-79.3441885, 43.6515001],
        [-79.3408701, 43.6488383],
        [-79.3373104, 43.6464342],
        [-79.333276, 43.6416257],
        [-79.3473348, 43.6330203],
        [-79.3707357, 43.6357606],
        [-79.3917716, 43.6226965],
        [-79.4151876, 43.6248065],
        [-79.424819, 43.631482],
        [-79.4315591, 43.6488051],
        [-79.4348953, 43.6562766],
        [-79.4387167, 43.6665798],
        [-79.4420403, 43.6781067],
      ],
    ],
    // Richmond Hill
    [
      [
        [-79.4694044, 43.88457],
        [-79.4232018, 43.8936896],
        [-79.4032572, 43.8964962],
        [-79.3914266, 43.8997167],
        [-79.3830137, 43.9014216],
        [-79.382225, 43.8966857],
        [-79.3774927, 43.8756534],
        [-79.3682911, 43.8384973],
        [-79.3827508, 43.8362217],
        [-79.417454, 43.838687],
        [-79.4539976, 43.8274977],
        [-79.4613589, 43.8544242],
        [-79.466617, 43.8747059],
        [-79.4694044, 43.88457],
      ],
    ],
  ],
};

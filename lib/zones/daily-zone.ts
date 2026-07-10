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
 * Final daily delivery zone — drawn via geojson.io (2026-07-09).
 * One continuous polygon covering the full daily service area.
 */
export const DAILY_DELIVERY_ZONE: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-79.4582389, 43.8477732],
      [-79.4330417, 43.8533597],
      [-79.4425451, 43.8898019],
      [-79.411531, 43.8957212],
      [-79.3935951, 43.8989523],
      [-79.3835062, 43.901914],
      [-79.3783739, 43.8834248],
      [-79.2677076, 43.9095098],
      [-79.257365, 43.8632943],
      [-79.3084393, 43.8493682],
      [-79.3271029, 43.8368356],
      [-79.3547765, 43.8298719],
      [-79.339606, 43.7902188],
      [-79.3283071, 43.728921],
      [-79.3257964, 43.713137],
      [-79.3324482, 43.7022546],
      [-79.3403542, 43.6965389],
      [-79.3501424, 43.6973554],
      [-79.3572954, 43.6919114],
      [-79.3614366, 43.6834722],
      [-79.3599307, 43.6755764],
      [-79.354735, 43.6663999],
      [-79.3441885, 43.6515001],
      [-79.3408701, 43.6488383],
      [-79.3373104, 43.6464342],
      [-79.333276, 43.6416257],
      [-79.3473348, 43.6330203],
      [-79.360597, 43.6438821],
      [-79.3781244, 43.6377748],
      [-79.3925785, 43.6355892],
      [-79.3876511, 43.6321834],
      [-79.3868881, 43.6293176],
      [-79.3917716, 43.6226965],
      [-79.4151876, 43.6248065],
      [-79.424819, 43.631482],
      [-79.4315591, 43.6488051],
      [-79.4348953, 43.6562766],
      [-79.4387167, 43.6665798],
      [-79.4487821, 43.6952825],
      [-79.426486, 43.7096492],
      [-79.4397004, 43.7576559],
      [-79.4582389, 43.8477732],
    ],
  ],
};

#!/usr/bin/env tsx
/**
 * Preflight impact audit for polygon-based delivery zone changes.
 *
 * Run this BEFORE switching any area's coverage to `mode: "polygon"` in
 * service-areas.ts. It lists:
 *   - Verified users whose stored lat/lng falls OUTSIDE the proposed polygon
 *   - Active weekly subscribers (status="active") with the same issue
 *
 * Usage:
 *   npx tsx scripts/audit-zone-impact.ts --area richmond-hill --service daily
 *   npx tsx scripts/audit-zone-impact.ts --area richmond-hill --service weekly
 *   npx tsx scripts/audit-zone-impact.ts --area downtown-toronto --service daily --dry-run
 *
 * The polygon to test against is read from ZONE_GEOMETRIES in
 * lib/zones/zone-geometry.ts. Make sure to add your polygon there before running.
 *
 * Options:
 *   --area      Required. The ServiceArea.id to audit (e.g. "richmond-hill")
 *   --service   Required. "daily" or "weekly"
 *   --dry-run   Print results only (default behaviour — this script never writes)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const areaId = getArg("--area");
const service = getArg("--service") as "daily" | "weekly" | undefined;

if (!areaId) {
  console.error("Error: --area is required (e.g. --area richmond-hill)");
  process.exit(1);
}

if (!service || (service !== "daily" && service !== "weekly")) {
  console.error('Error: --service is required and must be "daily" or "weekly"');
  process.exit(1);
}

// Dynamic imports so this script doesn't cause circular-dep issues at cold start
async function main() {
  const { ZONE_GEOMETRIES } = await import("../lib/zones/zone-geometry");
  const { isPointInGeometry, validateGeometry } = await import("../lib/zones/geo");
  const { SERVICE_AREAS } = await import("../lib/zones/service-areas");

  // Resolve the area
  const area = SERVICE_AREAS.find((a) => a.id === areaId);
  if (!area) {
    console.error(`Error: No service area found with id "${areaId}"`);
    console.error("Available area ids:", SERVICE_AREAS.map((a) => a.id).join(", "));
    process.exit(1);
  }

  // Resolve the polygon
  const geometry = ZONE_GEOMETRIES[areaId]?.[service];
  if (!geometry) {
    console.error(
      `Error: No polygon found for area "${areaId}" / service "${service}" in lib/zones/zone-geometry.ts`
    );
    console.error("Add your polygon there first, then re-run this audit.");
    process.exit(1);
  }

  // Validate the polygon before using it
  const validationErrors = validateGeometry(geometry);
  if (validationErrors.length > 0) {
    console.error("Error: The polygon geometry has validation errors:");
    validationErrors.forEach((e) => console.error(" •", e));
    process.exit(1);
  }

  console.log(`\nPolygon audit: ${area.label} — ${service} delivery`);
  console.log("=".repeat(60));

  // Connect to DB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB\n");

  // Dynamically import models (after mongoose is connected)
  const UserModule = await import("../models/User");
  const User = UserModule.default;
  const UserSubscriptionModule = await import("../models/UserSubscription");
  const UserSubscription = UserSubscriptionModule.default;

  // ── Verified users ────────────────────────────────────────────────────────

  const verifiedUsers = await User.find({
    addressVerified: true,
    "addressGeo.lat": { $exists: true, $ne: null },
    "addressGeo.lng": { $exists: true, $ne: null },
    "address.province": area.label,
    role: { $ne: "admin" },
  })
    .select("_id name email address addressGeo addressVerifiedAt")
    .lean();

  console.log(
    `Verified users with area "${area.label}" and coordinates: ${verifiedUsers.length}`
  );

  const usersOutside = verifiedUsers.filter((u) => {
    const lat = u.addressGeo?.lat;
    const lng = u.addressGeo?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") return true;
    return !isPointInGeometry(lat, lng, geometry);
  });

  if (usersOutside.length === 0) {
    console.log("  All verified users in this area fall INSIDE the polygon.");
  } else {
    console.log(
      `\n  WARNING: ${usersOutside.length} verified user(s) fall OUTSIDE the proposed polygon:`
    );
    usersOutside.forEach((u) => {
      const lat = u.addressGeo?.lat?.toFixed(6) ?? "?";
      const lng = u.addressGeo?.lng?.toFixed(6) ?? "?";
      console.log(
        `    - ${u.name || "(no name)"} <${u.email || "?"}>  lat=${lat} lng=${lng}`
      );
      console.log(`      Street: ${u.address?.streetAddress || "?"}, ${u.address?.postalCode || "?"}`);
    });
  }

  // ── Active weekly subscribers ─────────────────────────────────────────────

  if (service === "weekly") {
    const activeSubscriptions = await UserSubscription.find({
      status: "active",
      "deliveryAddress.province": area.label,
    })
      .select("_id userId deliveryAddress area")
      .lean();

    // Join user coords
    const userIds = activeSubscriptions.map((s) => s.userId);
    const subUsers = await User.find({ _id: { $in: userIds } })
      .select("_id addressGeo")
      .lean();

    const coordsMap = new Map(
      subUsers.map((u) => [String(u._id), u.addressGeo])
    );

    console.log(
      `\nActive weekly subscriptions with area "${area.label}": ${activeSubscriptions.length}`
    );

    const subsOutside = activeSubscriptions.filter((s) => {
      const geo = coordsMap.get(String(s.userId));
      const lat = geo?.lat;
      const lng = geo?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return true;
      return !isPointInGeometry(lat, lng, geometry);
    });

    if (subsOutside.length === 0) {
      console.log("  All active weekly subscribers in this area fall INSIDE the polygon.");
    } else {
      console.log(
        `\n  WARNING: ${subsOutside.length} active weekly subscriber(s) fall OUTSIDE the polygon:`
      );
      subsOutside.forEach((s) => {
        const geo = coordsMap.get(String(s.userId));
        const lat = geo?.lat?.toFixed(6) ?? "?";
        const lng = geo?.lng?.toFixed(6) ?? "?";
        console.log(
          `    - userId=${s.userId}  lat=${lat} lng=${lng}  street=${s.deliveryAddress?.streetAddress || "?"}`
        );
      });
    }
  }

  // ── Verified users WITHOUT coordinates ───────────────────────────────────

  const usersWithoutCoords = await User.find({
    addressVerified: true,
    "address.province": area.label,
    role: { $ne: "admin" },
    $or: [
      { "addressGeo.lat": { $exists: false } },
      { "addressGeo.lat": null },
      { "addressGeo.lng": { $exists: false } },
      { "addressGeo.lng": null },
    ],
  })
    .select("_id name email addressVerifiedAt")
    .lean();

  if (usersWithoutCoords.length > 0) {
    console.log(
      `\n  NOTE: ${usersWithoutCoords.length} verified user(s) in this area have NO stored coordinates.`
    );
    console.log(
      "  These users will be routed to /address/verify to re-capture their coordinates."
    );
    usersWithoutCoords.forEach((u) => {
      console.log(`    - ${u.name || "(no name)"} <${u.email || "?"}>`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    usersOutside.length === 0
      ? "Audit complete: no customers will be stranded by this polygon."
      : `Audit complete: ${usersOutside.length} customer(s) would be blocked. Review and widen polygon or handle individually.`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

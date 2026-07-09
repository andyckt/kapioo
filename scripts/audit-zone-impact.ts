#!/usr/bin/env tsx
/**
 * Zone impact audit — run this BEFORE activating a new daily polygon or weekly FSA list.
 *
 * Checks every verified customer in the database against the current zone data files
 * and lists anyone who would be affected (outside the daily polygon, or outside the
 * weekly FSA list). Use this to catch problems before customers do.
 *
 * Usage:
 *   npx tsx scripts/audit-zone-impact.ts --service daily
 *   npx tsx scripts/audit-zone-impact.ts --service weekly
 *
 * Options:
 *   --service   Required. "daily" or "weekly"
 *
 * Always run BOTH audits before deploying a zone change.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const args = process.argv.slice(2);
const service = args[args.indexOf("--service") + 1] as "daily" | "weekly" | undefined;

if (!service || (service !== "daily" && service !== "weekly")) {
  console.error('Error: --service is required and must be "daily" or "weekly"');
  console.error("  npx tsx scripts/audit-zone-impact.ts --service daily");
  console.error("  npx tsx scripts/audit-zone-impact.ts --service weekly");
  process.exit(1);
}

async function main() {
  const { isPointInGeometry, validateGeometry } = await import("../lib/zones/geo");
  const { DAILY_DELIVERY_ZONE } = await import("../lib/zones/daily-zone");
  const { WEEKLY_FSA_LIST } = await import("../lib/zones/weekly-fsas");
  const { normalizeFsa } = await import("../lib/zones/service-areas");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`\nZone impact audit — service: ${service}`);
  console.log("=".repeat(60));

  const UserModule = await import("../models/User");
  const User = UserModule.default;

  if (service === "daily") {
    // Validate the polygon before using it
    const errors = validateGeometry(DAILY_DELIVERY_ZONE);
    if (errors.length > 0) {
      console.error("Error: DAILY_DELIVERY_ZONE has validation errors:");
      errors.forEach((e) => console.error(" •", e));
      await mongoose.disconnect();
      process.exit(1);
    }

    const verified = await User.find({
      addressVerified: true,
      "addressGeo.lat": { $exists: true, $ne: null },
      "addressGeo.lng": { $exists: true, $ne: null },
      role: { $ne: "admin" },
    })
      .select("_id name email address addressGeo addressVerifiedAt")
      .lean();

    console.log(`Verified users with coordinates: ${verified.length}`);

    const outside = verified.filter((u) => {
      const lat = u.addressGeo?.lat;
      const lng = u.addressGeo?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return true;
      return !isPointInGeometry(lat, lng, DAILY_DELIVERY_ZONE);
    });

    const noCoords = await User.find({
      addressVerified: true,
      role: { $ne: "admin" },
      $or: [
        { "addressGeo.lat": { $exists: false } },
        { "addressGeo.lat": null },
        { "addressGeo.lng": { $exists: false } },
        { "addressGeo.lng": null },
      ],
    })
      .select("_id name email")
      .lean();

    if (outside.length === 0) {
      console.log("  All verified users with coordinates fall INSIDE the daily zone.");
    } else {
      console.log(`\n  WARNING: ${outside.length} user(s) fall OUTSIDE the daily polygon:`);
      outside.forEach((u) => {
        const lat = u.addressGeo?.lat?.toFixed(6) ?? "?";
        const lng = u.addressGeo?.lng?.toFixed(6) ?? "?";
        console.log(`    - ${u.name || "(no name)"} <${u.email || "?"}>`);
        console.log(`      lat=${lat}, lng=${lng}, street=${u.address?.streetAddress || "?"}, postal=${u.address?.postalCode || "?"}`);
      });
    }

    if (noCoords.length > 0) {
      console.log(`\n  NOTE: ${noCoords.length} verified user(s) have no stored coordinates.`);
      console.log("  These users will be routed to /address/verify on next login.");
    }

    console.log("\n" + "=".repeat(60));
    console.log(
      outside.length === 0
        ? "Audit complete: safe to activate this daily zone."
        : `Audit complete: ${outside.length} customer(s) affected. Widen polygon or handle individually before activating.`
    );
  }

  if (service === "weekly") {
    if (WEEKLY_FSA_LIST === null) {
      console.log("\n  WEEKLY_FSA_LIST is null — carrier list not yet received.");
      console.log("  Weekly eligibility currently uses the label fallback (same as before).");
      console.log("  Run this audit after pasting the carrier FSA list into weekly-fsas.ts.");
      await mongoose.disconnect();
      return;
    }

    const normalizedList = WEEKLY_FSA_LIST.map(normalizeFsa);

    const verified = await User.find({
      addressVerified: true,
      role: { $ne: "admin" },
    })
      .select("_id name email address addressGeo")
      .lean();

    console.log(`Verified users: ${verified.length}`);

    const outside = verified.filter((u) => {
      const postalCode = u.addressGeo?.postalCode || u.address?.postalCode;
      const fsa = normalizeFsa(postalCode);
      if (!fsa) return false; // no postal code — label fallback, not stranded
      return !normalizedList.includes(fsa);
    });

    const noPostal = verified.filter((u) => {
      const postalCode = u.addressGeo?.postalCode || u.address?.postalCode;
      return !normalizeFsa(postalCode);
    });

    if (outside.length === 0) {
      console.log("  All verified users with postal codes are within the carrier FSA list.");
    } else {
      console.log(`\n  WARNING: ${outside.length} user(s) have FSAs NOT in the carrier list:`);
      outside.forEach((u) => {
        const postal = u.addressGeo?.postalCode || u.address?.postalCode || "?";
        const fsa = normalizeFsa(postal);
        console.log(`    - ${u.name || "(no name)"} <${u.email || "?"}> FSA=${fsa} (${postal})`);
      });
    }

    if (noPostal.length > 0) {
      console.log(`\n  NOTE: ${noPostal.length} user(s) have no stored postal code (label fallback applies).`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(
      outside.length === 0
        ? "Audit complete: safe to activate this weekly FSA list."
        : `Audit complete: ${outside.length} customer(s) would lose weekly access. Review before activating.`
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

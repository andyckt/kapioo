import { loadEnvConfig } from "@next/env";

/** Run once before rollout; does not alter orders, balances, or feature flags. */
async function main() {
  loadEnvConfig(process.cwd());
  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("../lib/db")).default;
  const support = await import("../models/Support");
  const changes = (await import("../models/CustomerOrderChange")).default;
  const groups = (await import("../models/WeeklyEntitlementGroup")).default;
  await connectToDatabase();
  for (const model of [...Object.values(support), changes, groups]) {
    await model.createCollection();
    await model.createIndexes();
    console.log(`Ready: ${model.modelName}`);
  }
  await mongoose.disconnect();
}
main().catch(error => { console.error("Support setup failed:", error.message); process.exitCode = 1; });

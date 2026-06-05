#!/usr/bin/env tsx
import dotenv from "dotenv";
import mongoose from "mongoose";

import {
  getDeliveryLearningBackfillCliUsage,
  parseDeliveryLearningBackfillCliArgs,
} from "@/lib/agents/delivery/learning/backfill/backfill-cli-args";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main(): Promise<void> {
  const args = parseDeliveryLearningBackfillCliArgs(process.argv.slice(2));

  if (args.help) {
    console.log(getDeliveryLearningBackfillCliUsage());
    return;
  }

  if (!args.confirm) {
    throw new Error(
      `Refusing to run delivery learning backfill without --confirm.\n\n${getDeliveryLearningBackfillCliUsage()}`
    );
  }

  const { backfillDeliveryAgentLearningCasesForDateRange } = await import(
    "@/lib/agents/delivery/learning/backfill/backfill-learning-cases-for-date-range"
  );
  const summary = await backfillDeliveryAgentLearningCasesForDateRange({
    startDate: args.startDate,
    endDate: args.endDate,
    profileId: args.profileId,
    force: args.force,
    maxDates: args.maxDates,
    backfillBatchId: args.backfillBatchId,
    logProgress: args.logProgress,
  });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.errorCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Delivery learning backfill failed."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

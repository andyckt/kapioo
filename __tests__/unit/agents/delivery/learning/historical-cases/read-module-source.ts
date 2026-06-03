import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readHistoricalOrdersForLearningSource(): string {
  return readFileSync(
    resolve(
      process.cwd(),
      "lib/agents/delivery/learning/historical-cases/get-historical-orders-for-learning.ts"
    ),
    "utf8"
  );
}

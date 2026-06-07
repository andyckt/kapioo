import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import type { BackfillDeliveryAgentLearningCasesForDateRangeInput } from "@/lib/agents/delivery/learning/backfill/backfill-learning-cases-for-date-range";

const DEFAULT_CLI_ROUTE_OPTIMIZER_REQUEST_DELAY_MS = 7000;
const DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRIES = 2;
const DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRY_DELAY_MS = 20000;

export type DeliveryAgentLearningBackfillCliArgs =
  BackfillDeliveryAgentLearningCasesForDateRangeInput & {
    confirm: boolean;
    help: boolean;
  };

const USAGE = `Usage:
  npm run backfill:delivery-learning -- --start=YYYY-MM-DD --end=YYYY-MM-DD --confirm

Options:
  --start=YYYY-MM-DD       First delivery date to backfill.
  --end=YYYY-MM-DD         Last delivery date to backfill.
  --profile-id=ID          Optional planning profile id.
  --max-dates=N            Safety cap for date count. Default is service default.
  --batch-id=ID            Optional backfill batch id.
  --force                  Recheck existing cases, but unchanged source data is still skipped.
  --dry-run                Build and audit learning cases without writing them.
  --ro-delay-ms=N          Delay before each RO historical read. Default ${DEFAULT_CLI_ROUTE_OPTIMIZER_REQUEST_DELAY_MS}.
  --ro-retries=N           Retries after RO 429 rate limits. Default ${DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRIES}.
  --ro-retry-delay-ms=N    Delay before retry after RO 429. Default ${DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRY_DELAY_MS}.
  --log-progress           Print JSON progress lines per date.
  --confirm                Required to run the backfill.
  --help                   Show this help text.`;

function readFlagValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const equalsValue = args.find((arg) => arg.startsWith(prefix));
  if (equalsValue) {
    return equalsValue.slice(prefix.length);
  }

  const index = args.indexOf(name);
  if (index >= 0) {
    const value = args[index + 1];
    if (value && !value.startsWith("--")) {
      return value;
    }
  }

  return undefined;
}

function parsePositiveInteger(value: string | undefined, flagName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string | undefined, flagName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }

  return parsed;
}

export function getDeliveryLearningBackfillCliUsage(): string {
  return USAGE;
}

export function parseDeliveryLearningBackfillCliArgs(
  argv: string[]
): DeliveryAgentLearningBackfillCliArgs {
  const help = argv.includes("--help") || argv.includes("-h");
  const startDate = readFlagValue(argv, "--start");
  const endDate = readFlagValue(argv, "--end");

  if (help) {
    return {
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      confirm: false,
      help: true,
    };
  }

  if (!startDate) {
    throw new Error("--start=YYYY-MM-DD is required.");
  }

  if (!endDate) {
    throw new Error("--end=YYYY-MM-DD is required.");
  }

  const maxDates = parsePositiveInteger(readFlagValue(argv, "--max-dates"), "--max-dates");
  const profileId = readFlagValue(argv, "--profile-id");
  const backfillBatchId = readFlagValue(argv, "--batch-id");
  const routeOptimizerRequestDelayMs =
    parseNonNegativeInteger(readFlagValue(argv, "--ro-delay-ms"), "--ro-delay-ms") ??
    DEFAULT_CLI_ROUTE_OPTIMIZER_REQUEST_DELAY_MS;
  const routeOptimizerRateLimitRetries =
    parseNonNegativeInteger(readFlagValue(argv, "--ro-retries"), "--ro-retries") ??
    DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRIES;
  const routeOptimizerRateLimitRetryDelayMs =
    parseNonNegativeInteger(readFlagValue(argv, "--ro-retry-delay-ms"), "--ro-retry-delay-ms") ??
    DEFAULT_CLI_ROUTE_OPTIMIZER_RATE_LIMIT_RETRY_DELAY_MS;

  return {
    startDate: validateLearningDeliveryDate(startDate),
    endDate: validateLearningDeliveryDate(endDate),
    ...(profileId ? { profileId } : {}),
    ...(backfillBatchId ? { backfillBatchId } : {}),
    ...(maxDates ? { maxDates } : {}),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
    routeOptimizerRequestDelayMs,
    routeOptimizerRateLimitRetries,
    routeOptimizerRateLimitRetryDelayMs,
    logProgress: argv.includes("--log-progress"),
    confirm: argv.includes("--confirm"),
    help: false,
  };
}

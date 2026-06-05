import { validateLearningDeliveryDate } from "@/lib/agents/delivery/learning/historical-cases/validate-learning-delivery-date";
import type { BackfillDeliveryAgentLearningCasesForDateRangeInput } from "@/lib/agents/delivery/learning/backfill/backfill-learning-cases-for-date-range";

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

  return {
    startDate: validateLearningDeliveryDate(startDate),
    endDate: validateLearningDeliveryDate(endDate),
    ...(profileId ? { profileId } : {}),
    ...(backfillBatchId ? { backfillBatchId } : {}),
    ...(maxDates ? { maxDates } : {}),
    force: argv.includes("--force"),
    logProgress: argv.includes("--log-progress"),
    confirm: argv.includes("--confirm"),
    help: false,
  };
}

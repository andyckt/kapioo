import connectToDatabase from "@/lib/db";
import User from "@/models/User";

import { getNextWeekMenuBlocklist } from "./blocklist";
import { parseEmailList, type ParsedEmailList } from "./parse-emails";

export const NEXT_WEEK_MENU_ELIGIBLE_QUERY = {
  isVerified: true,
  emailStatus: { $ne: "bounced" },
  email: { $exists: true, $nin: ["", null] },
  "emailPreferences.nextWeekMenuUpdates": { $ne: false },
} as const;

export type NextWeekMenuCriteriaType = "all" | "selected" | "emails";

export type NextWeekMenuSkippedRecipients = {
  invalidFormat: string[];
  notRegistered: string[];
  unsubscribed: string[];
  adminExcluded: string[];
  bounced: string[];
  unverified: string[];
  invalid: string[];
  duplicateCount: number;
};

export type ResolveNextWeekMenuRecipientsResult = {
  criteriaType: NextWeekMenuCriteriaType;
  eligibleUserIds: string[];
  skipped: NextWeekMenuSkippedRecipients;
};

type UserRecipientRow = {
  _id: unknown;
  email?: string;
  isVerified?: boolean;
  emailStatus?: string;
  emailPreferences?: { nextWeekMenuUpdates?: boolean };
};

const emptySkipped = (): NextWeekMenuSkippedRecipients => ({
  invalidFormat: [],
  notRegistered: [],
  unsubscribed: [],
  adminExcluded: [],
  bounced: [],
  unverified: [],
  invalid: [],
  duplicateCount: 0,
});

export function buildNextWeekMenuEligibleQuery(blocklist: string[] = []) {
  const query: Record<string, unknown> = {
    ...NEXT_WEEK_MENU_ELIGIBLE_QUERY,
  };

  if (blocklist.length > 0) {
    query.email = {
      $exists: true,
      $nin: ["", null, ...blocklist],
    };
  }

  return query;
}

function categorizeIneligibleUser(
  user: UserRecipientRow,
  blocklistSet: Set<string>
): keyof Omit<NextWeekMenuSkippedRecipients, "duplicateCount" | "invalidFormat" | "notRegistered"> | null {
  if (!user.email) return "invalid";

  const normalizedEmail = user.email.trim().toLowerCase();
  if (blocklistSet.has(normalizedEmail)) return "adminExcluded";
  if (user.emailPreferences?.nextWeekMenuUpdates === false) return "unsubscribed";
  if (user.emailStatus === "bounced" || user.emailStatus === "blocked") return "bounced";
  if (!user.isVerified) return "unverified";
  return null;
}

function resolveFromParsedEmails(
  parsed: ParsedEmailList,
  blocklistSet: Set<string>
): Promise<ResolveNextWeekMenuRecipientsResult> {
  const skipped = emptySkipped();
  skipped.invalidFormat = parsed.invalid;
  skipped.duplicateCount = parsed.duplicateCount;

  if (parsed.valid.length === 0) {
    return Promise.resolve({
      criteriaType: "emails",
      eligibleUserIds: [],
      skipped,
    });
  }

  for (const email of parsed.valid) {
    if (blocklistSet.has(email)) {
      skipped.adminExcluded.push(email);
    }
  }

  const emailsToLookup = parsed.valid.filter((email) => !blocklistSet.has(email));
  if (emailsToLookup.length === 0) {
    return Promise.resolve({
      criteriaType: "emails",
      eligibleUserIds: [],
      skipped,
    });
  }

  return User.find({ email: { $in: emailsToLookup } })
    .select("_id email isVerified emailStatus emailPreferences")
    .lean<UserRecipientRow[]>()
    .then((users) => {
      const userByEmail = new Map(
        users.map((user) => [String(user.email).toLowerCase(), user])
      );
      const eligibleUserIds: string[] = [];

      for (const email of emailsToLookup) {
        const user = userByEmail.get(email);
        if (!user) {
          skipped.notRegistered.push(email);
          continue;
        }

        const reason = categorizeIneligibleUser(user, blocklistSet);
        if (reason) {
          skipped[reason].push(email);
          continue;
        }

        eligibleUserIds.push(String(user._id));
      }

      return {
        criteriaType: "emails" as const,
        eligibleUserIds,
        skipped,
      };
    });
}

export async function resolveNextWeekMenuRecipients(input: {
  userIds?: string[];
  emails?: string[];
}): Promise<ResolveNextWeekMenuRecipientsResult> {
  await connectToDatabase();

  const blocklist = await getNextWeekMenuBlocklist();
  const blocklistSet = new Set(blocklist);
  const eligibleQuery = buildNextWeekMenuEligibleQuery(blocklist);

  const emailInputs = input.emails ?? [];
  if (emailInputs.length > 0) {
    return resolveFromParsedEmails(parseEmailList(emailInputs), blocklistSet);
  }

  const userIds = (input.userIds ?? []).filter(Boolean);
  if (userIds.length > 0) {
    const users = await User.find({
      ...eligibleQuery,
      _id: { $in: userIds },
    })
      .select("_id")
      .lean();

    return {
      criteriaType: "selected",
      eligibleUserIds: users.map((user) => String(user._id)),
      skipped: emptySkipped(),
    };
  }

  const users = await User.find(eligibleQuery).select("_id").lean();

  return {
    criteriaType: "all",
    eligibleUserIds: users.map((user) => String(user._id)),
    skipped: emptySkipped(),
  };
}

export async function getNextWeekMenuEligibleQuery() {
  const blocklist = await getNextWeekMenuBlocklist();
  return buildNextWeekMenuEligibleQuery(blocklist);
}

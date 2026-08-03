import connectToDatabase from "@/lib/db";
import Settings from "@/models/Settings";

import { parseEmailList } from "./parse-emails";

export const NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY = "nextWeekMenuEmailBlocklist";

const BLOCKLIST_DESCRIPTION =
  "Admin-managed email exclusion list for Next Week Menu Update emails";

export function normalizeBlocklistEmail(email: string): string {
  return email.trim().toLowerCase();
}

function dedupeNormalizedEmails(emails: string[]): string[] {
  return [...new Set(emails.map(normalizeBlocklistEmail).filter(Boolean))];
}

function readBlocklistValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeNormalizedEmails(value.filter((entry): entry is string => typeof entry === "string"));
}

async function saveBlocklist(emails: string[]): Promise<string[]> {
  const normalized = dedupeNormalizedEmails(emails);

  await Settings.findOneAndUpdate(
    { key: NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY },
    {
      key: NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY,
      value: normalized,
      description: BLOCKLIST_DESCRIPTION,
    },
    { upsert: true, new: true }
  );

  return normalized;
}

export async function getNextWeekMenuBlocklist(): Promise<string[]> {
  await connectToDatabase();

  const setting = await Settings.findOne({ key: NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY }).lean();
  return readBlocklistValue(setting?.value);
}

export type AddToNextWeekMenuBlocklistResult = {
  added: string[];
  duplicates: string[];
  invalid: string[];
  emails: string[];
};

export async function addToNextWeekMenuBlocklist(
  inputs: string[]
): Promise<AddToNextWeekMenuBlocklistResult> {
  await connectToDatabase();

  const parsed = parseEmailList(inputs);
  const current = await getNextWeekMenuBlocklist();
  const currentSet = new Set(current);

  const added: string[] = [];
  const duplicates: string[] = [];

  for (const email of parsed.valid) {
    if (currentSet.has(email)) {
      duplicates.push(email);
      continue;
    }

    currentSet.add(email);
    added.push(email);
  }

  const emails = await saveBlocklist([...currentSet]);

  return {
    added,
    duplicates,
    invalid: parsed.invalid,
    emails,
  };
}

export type RemoveFromNextWeekMenuBlocklistResult = {
  removed: string[];
  notFound: string[];
  emails: string[];
};

export async function removeFromNextWeekMenuBlocklist(
  inputs: string[]
): Promise<RemoveFromNextWeekMenuBlocklistResult> {
  await connectToDatabase();

  const parsed = parseEmailList(inputs);
  const current = await getNextWeekMenuBlocklist();
  const currentSet = new Set(current);

  const removed: string[] = [];
  const notFound: string[] = [];

  for (const email of parsed.valid) {
    if (currentSet.delete(email)) {
      removed.push(email);
    } else {
      notFound.push(email);
    }
  }

  const emails = await saveBlocklist([...currentSet]);

  return {
    removed,
    notFound,
    emails,
  };
}

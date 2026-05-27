import User from "@/models/User";

const USER_ID_PREFIX = "user";
const MAX_ALLOCATION_ATTEMPTS = 8;

function randomLegacyUserId(): string {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `${USER_ID_PREFIX}${randomNum}`;
}

/**
 * Picks a display userID in the legacy `user###` format.
 * Uses `exists` (indexed) instead of `findOne`, and falls back to a time-based suffix
 * if the numeric space is crowded.
 */
export async function generateUniqueUserID(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const candidate = randomLegacyUserId();
    const taken = await User.exists({ userID: candidate });
    if (!taken) {
      return candidate;
    }
  }

  const suffix = Date.now().toString(36).slice(-4);
  return `${USER_ID_PREFIX}${suffix}`;
}

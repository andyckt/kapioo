import {
  getStoredUser as getCachedUser,
  mergeStoredUser,
} from "@/lib/client-user-cache";
import { updateUser, type User } from "@/lib/utils";

export interface EnsurePhoneOptions {
  userId: string;
  phoneInput: string;
  requirePhone: boolean;
}

export interface EnsurePhoneResult {
  ok: boolean;
  errorMessage?: string;
  updatedUser?: User;
}

export function getStoredUser(): User | null {
  return getCachedUser() as User | null;
}

export function normalizePhoneInput(phone: string): string {
  // Basic normalisation: trim and collapse internal whitespace.
  return phone.replace(/\s+/g, " ").trim();
}

export async function ensureUserPhone(
  options: EnsurePhoneOptions
): Promise<EnsurePhoneResult> {
  const { userId, phoneInput, requirePhone } = options;
  const normalizedPhone = normalizePhoneInput(phoneInput);

  if (!normalizedPhone && !requirePhone) {
    return { ok: true };
  }

  if (!normalizedPhone) {
    return {
      ok: false,
      errorMessage: "Please enter your phone number.",
    };
  }

  const storedUser = getStoredUser();
  const currentPhone = storedUser?.phone ?? "";

  if (storedUser && currentPhone === normalizedPhone) {
    // Nothing to update.
    return { ok: true, updatedUser: storedUser };
  }

  try {
    const updated = await updateUser(userId, { phone: normalizedPhone });
    if (!updated) {
      return {
        ok: false,
        errorMessage: "Failed to save phone number. Please try again.",
      };
    }

    // Merge to preserve richer cached user fields while updating phone.
    mergeStoredUser(updated);

    return { ok: true, updatedUser: updated };
  } catch (error) {
    console.error("Error ensuring user phone:", error);
    return {
      ok: false,
      errorMessage: "Failed to save phone number. Please try again.",
    };
  }
}


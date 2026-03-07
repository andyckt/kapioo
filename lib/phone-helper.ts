import { mergeStoredUser } from "@/lib/client-user-cache";
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
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch (error) {
    console.error("Failed to parse stored user from localStorage:", error);
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem("user", JSON.stringify(user));
  } catch (error) {
    console.error("Failed to write user to localStorage:", error);
  }
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


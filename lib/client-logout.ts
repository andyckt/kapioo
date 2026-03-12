"use client";

import { signOut } from "next-auth/react";

// Keys cleared on logout / when auth says not authenticated.
// preferredLanguage and languagePreferenceSet are kept so guest language choice persists.
const USER_SCOPED_STORAGE_KEYS = [
  "user",
  "isAuthenticated",
  "selectedMeals",
  "selectedMealPlan",
] as const;

export function clearClientUserState(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of USER_SCOPED_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export async function performClientLogout(): Promise<void> {
  await fetch("/api/auth/admin-mfa", { method: "DELETE" }).catch(() => undefined);

  clearClientUserState();

  await signOut({ redirect: false });
}

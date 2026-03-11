"use client";

import { signOut } from "next-auth/react";

const USER_SCOPED_STORAGE_KEYS = ["user", "isAuthenticated"] as const;

export async function performClientLogout(): Promise<void> {
  await fetch("/api/auth/admin-mfa", { method: "DELETE" }).catch(() => undefined);

  for (const key of USER_SCOPED_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }

  await signOut({ redirect: false });
}

"use client"

import { useEffect } from "react"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { clearClientUserState } from "@/lib/client-logout"

export default function AppInitializer() {
  useEffect(() => {
    const syncSessionState = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch auth state");
        }

        const result = await response.json();

        if (result?.authenticated && result?.user) {
          mergeStoredUser(result.user);
          localStorage.setItem("isAuthenticated", "true");
        } else {
          clearClientUserState();
        }
      } catch (error) {
        console.error("Failed to synchronize auth state:", error);
      }
    };

    syncSessionState();
  }, []);

  return null;
} 
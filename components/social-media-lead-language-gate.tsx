"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useClientAuth } from "@/lib/client-auth";
import { LeadLanguageChooserDialog } from "@/components/lead-language-chooser-dialog";

/**
 * Language chooser for `/social-media` (QR / bio).
 *
 * Per design, this does **not** open if:
 * - `languagePreferenceSet` is already in localStorage (user chose on this browser before), or
 * - The visitor is **logged in** and has `languagePreference` from the account (see `/api/auth/me`).
 *
 * To test as a lead: use a private window, or log out, or clear `languagePreferenceSet` in localStorage.
 */
export function SocialMediaLeadLanguageGate() {
  const { setLanguage } = useLanguage();
  const { status: authStatus, authenticated, user } = useClientAuth();
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authStatus !== "ready") return;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    /** Profile language from cached `user` (may exist before hydrate). */
    const syncFromStoredUser = (): boolean => {
      try {
        const raw = localStorage.getItem("user");
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { languagePreference?: string };
        const pref = parsed.languagePreference;
        if (pref !== "zh" && pref !== "en") return false;
        setLanguage(pref);
        localStorage.setItem("languagePreferenceSet", "true");
        localStorage.setItem("preferredLanguage", pref);
        setOpen(false);
        return true;
      } catch {
        return false;
      }
    };

    /** Canonical account preference from auth snapshot. Logged-in users skip the funnel popup. */
    const syncFromAuthUser = (): boolean => {
      if (!authenticated || !user) return false;
      const pref = user.languagePreference as string | undefined;
      if (pref !== "zh" && pref !== "en") return false;
      setLanguage(pref);
      localStorage.setItem("languagePreferenceSet", "true");
      localStorage.setItem("preferredLanguage", pref);
      setOpen(false);
      return true;
    };

    if (syncFromStoredUser()) {
      return;
    }

    if (syncFromAuthUser()) {
      return;
    }

    if (localStorage.getItem("languagePreferenceSet")) {
      setOpen(false);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (localStorage.getItem("languagePreferenceSet")) return;
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw) as { languagePreference?: string };
          const pref = parsed.languagePreference;
          if (pref === "zh" || pref === "en") return;
        }
      } catch {
        /* ignore */
      }
      if (authenticated && user) {
        const pref = user.languagePreference as string | undefined;
        if (pref === "zh" || pref === "en") return;
      }
      if (hasOpenedRef.current) return;
      hasOpenedRef.current = true;
      setOpen(true);
    }, 320);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [authStatus, authenticated, user, setLanguage]);

  return <LeadLanguageChooserDialog open={open} onOpenChange={setOpen} />;
}

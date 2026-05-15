"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useClientAuth } from "@/lib/client-auth";
import { LeadLanguageChooserDialog } from "@/components/lead-language-chooser-dialog";

function isSocialMediaPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/social-media";
}

export function LanguagePreferenceDialog() {
  const pathname = usePathname();
  const skipForSocial = isSocialMediaPath(pathname);

  const { setLanguage } = useLanguage();
  const { status: authStatus } = useClientAuth();
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (skipForSocial) return;

    if (authStatus !== "ready") return;

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr) as { languagePreference?: string };
        if (user.languagePreference === "zh" || user.languagePreference === "en") {
          setLanguage(user.languagePreference);
          localStorage.setItem("languagePreferenceSet", "true");
          localStorage.setItem("preferredLanguage", user.languagePreference);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    const hasSetLanguage = localStorage.getItem("languagePreferenceSet");
    if (!hasSetLanguage) {
      const timer = setTimeout(() => {
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr) as { languagePreference?: string };
            if (user.languagePreference === "zh" || user.languagePreference === "en") return;
          }
          if (localStorage.getItem("languagePreferenceSet")) return;
        } catch {
          /* ignore */
        }
        if (hasOpenedRef.current) return;
        hasOpenedRef.current = true;
        setOpen(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authStatus, setLanguage, skipForSocial]);

  if (skipForSocial) {
    return null;
  }

  return <LeadLanguageChooserDialog open={open} onOpenChange={setOpen} />;
}

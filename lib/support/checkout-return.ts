"use client";
export function consumeSupportReturnPath(): string | null {
  try {
    const raw = sessionStorage.getItem("kapioo.assistant.returnTo");
    if (!raw) return null;
    const value = JSON.parse(raw);
    sessionStorage.removeItem("kapioo.assistant.returnTo");
    if (value.expiresAt < Date.now() || typeof value.path !== "string" || !value.path.startsWith("/dashboard?")) return null;
    const parsed = new URL(value.path, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname === "/dashboard" ? `${parsed.pathname}${parsed.search}` : null;
  } catch { return null; }
}

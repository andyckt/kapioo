"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAddressVerified } from "@/lib/address/is-verified";
import { useClientAuth } from "@/lib/client-auth";

const ALLOWED_PATH_PREFIXES = [
  "/address/verify",
  "/login",
  "/logout",
  "/api",
  "/_next",
  "/favicon",
];

function isAllowedPath(pathname: string) {
  return ALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AddressVerificationGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, status, user } = useClientAuth();

  useEffect(() => {
    if (status !== "ready" || !authenticated || !user) return;
    if (user.role === "admin") return;
    if (isAllowedPath(pathname)) return;
    if (isAddressVerified(user)) return;

    router.replace("/address/verify");
  }, [authenticated, pathname, router, status, user]);

  return null;
}

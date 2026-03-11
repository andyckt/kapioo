"use client";

import type { ReactNode } from "react";

import { ClientAuthProvider } from "@/lib/client-auth";

export default function AppInitializer({ children }: { children: ReactNode }) {
  return <ClientAuthProvider>{children}</ClientAuthProvider>;
}
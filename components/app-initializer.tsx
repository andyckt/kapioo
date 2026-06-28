"use client";

import type { ReactNode } from "react";

import { AddressVerificationGate } from "@/components/address-verification-gate";
import { ClientAuthProvider } from "@/lib/client-auth";

export default function AppInitializer({ children }: { children: ReactNode }) {
  return (
    <ClientAuthProvider>
      <AddressVerificationGate />
      {children}
    </ClientAuthProvider>
  );
}
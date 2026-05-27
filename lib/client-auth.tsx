"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { mergeStoredUser } from "@/lib/client-user-cache";
import { clearClientUserState } from "@/lib/client-logout";

type ClientAuthUser = Record<string, any>;

export interface ClientAuthSnapshot {
  authenticated: boolean;
  user: ClientAuthUser | null;
  requiresAdminMfa: boolean;
  adminMfaEmail: string | null;
}

interface ClientAuthContextValue extends ClientAuthSnapshot {
  status: "loading" | "ready";
  refreshAuthState: (options?: { force?: boolean }) => Promise<ClientAuthSnapshot>;
  /** Apply auth from signup/register without an extra /api/auth/me round-trip. */
  applyAuthSnapshot: (snapshot: ClientAuthSnapshot) => void;
}

const EMPTY_AUTH_STATE: ClientAuthSnapshot = {
  authenticated: false,
  user: null,
  requiresAdminMfa: false,
  adminMfaEmail: null,
};

const ClientAuthContext = createContext<ClientAuthContextValue>({
  status: "loading",
  ...EMPTY_AUTH_STATE,
  refreshAuthState: async () => EMPTY_AUTH_STATE,
  applyAuthSnapshot: () => {},
});

let inflightAuthRequest: Promise<ClientAuthSnapshot> | null = null;

async function fetchClientAuthSnapshot(force: boolean = false): Promise<ClientAuthSnapshot> {
  if (!force && inflightAuthRequest) {
    return inflightAuthRequest;
  }

  inflightAuthRequest = fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch auth state");
      }

      const result = await response.json();

      if (!result?.authenticated || !result?.user) {
        return EMPTY_AUTH_STATE;
      }

      return {
        authenticated: true,
        user: result.user,
        requiresAdminMfa: Boolean(result.requiresAdminMfa),
        adminMfaEmail: result.adminMfaEmail || null,
      };
    })
    .catch((error) => {
      console.error("Failed to fetch client auth snapshot:", error);
      return EMPTY_AUTH_STATE;
    })
    .finally(() => {
      inflightAuthRequest = null;
    });

  return inflightAuthRequest;
}

function syncClientAuthCache(snapshot: ClientAuthSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  if (snapshot.authenticated && snapshot.user) {
    mergeStoredUser(snapshot.user);
    localStorage.setItem("isAuthenticated", "true");
    return;
  }

  clearClientUserState();
}

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<ClientAuthSnapshot>(EMPTY_AUTH_STATE);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const refreshAuthState = useCallback(
    async (options?: { force?: boolean }) => {
      const nextState = await fetchClientAuthSnapshot(Boolean(options?.force));
      syncClientAuthCache(nextState);
      setAuthState(nextState);
      setStatus("ready");
      return nextState;
    },
    []
  );

  const applyAuthSnapshot = useCallback((snapshot: ClientAuthSnapshot) => {
    syncClientAuthCache(snapshot);
    setAuthState(snapshot);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void refreshAuthState({ force: true });
  }, [refreshAuthState]);

  const contextValue = useMemo(
    () => ({
      status,
      ...authState,
      refreshAuthState,
      applyAuthSnapshot,
    }),
    [applyAuthSnapshot, authState, refreshAuthState, status]
  );

  return (
    <ClientAuthContext.Provider value={contextValue}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  return useContext(ClientAuthContext);
}

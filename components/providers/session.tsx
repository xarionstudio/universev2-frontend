"use client";

import * as React from "react";

import { authApi } from "@/lib/api/auth";
import type { AuthPerms, AuthUser } from "@/lib/api/types";

const KEY = "universe-auth-user";
const PERMS_KEY = "universe-auth-perms";

let listeners: Array<() => void> = [];

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", cb);
  }
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", cb);
    }
  };
}

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readPerms(): AuthPerms | null {
  try {
    const raw = localStorage.getItem(PERMS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const serverNull = () => null;
const serverFalse = () => false;
const clientTrue = () => true;

type SessionCtx = {
  user: AuthUser | null;
  perms: AuthPerms | null;
  email: string | null;
  hydrated: boolean;
  signIn: (user: AuthUser, perms?: AuthPerms) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = React.useSyncExternalStore(subscribe, readUser, serverNull);
  const perms = React.useSyncExternalStore(subscribe, readPerms, serverNull);
  const hydrated = React.useSyncExternalStore(
    subscribe,
    clientTrue,
    serverFalse
  );

  const signIn = React.useCallback(
    (newUser: AuthUser, newPerms?: AuthPerms) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(newUser));
        if (newPerms) {
          localStorage.setItem(PERMS_KEY, JSON.stringify(newPerms));
        }
      } catch {}
      emit();
    },
    []
  );

  const signOut = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(PERMS_KEY);
    } catch {}
    emit();
  }, []);

  const refreshProfile = React.useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      if (profile) {
        localStorage.setItem(KEY, JSON.stringify(profile));
        emit();
      }
    } catch (err) {
      console.warn("Failed to fetch current user profile", err);
    }
  }, []);

  // Validate session against backend profile on mount
  React.useEffect(() => {
    if (hydrated && user) {
      authApi.getProfile().catch(() => {
        // If cookie is invalid or expired, clear session
        localStorage.removeItem(KEY);
        localStorage.removeItem(PERMS_KEY);
        emit();
      });
    }
  }, [hydrated, user]);

  const value = React.useMemo(
    () => ({
      user,
      perms,
      email: user?.email ?? null,
      hydrated,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, perms, hydrated, signIn, signOut, refreshProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = React.useContext(Ctx);
  if (!v)
    throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  return v;
}

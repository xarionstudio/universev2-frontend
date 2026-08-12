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

// Cache to maintain referential equality and prevent infinite loops
const userCache: { value: AuthUser | null; raw: string | null } = {
  value: null,
  raw: null,
};
const permsCache: { value: AuthPerms | null; raw: string | null } = {
  value: null,
  raw: null,
};

// Cached getSnapshot functions for useSyncExternalStore
const cachedGetUserSnapshot = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (userCache.raw === raw) {
      return userCache.value;
    }
    userCache.raw = raw;
    userCache.value = raw ? JSON.parse(raw) : null;
    return userCache.value;
  } catch {
    userCache.value = null;
    userCache.raw = null;
    return null;
  }
};

const cachedGetPermsSnapshot = () => {
  try {
    const raw = localStorage.getItem(PERMS_KEY);
    if (permsCache.raw === raw) {
      return permsCache.value;
    }
    permsCache.raw = raw;
    permsCache.value = raw ? JSON.parse(raw) : null;
    return permsCache.value;
  } catch {
    permsCache.value = null;
    permsCache.raw = null;
    return null;
  }
};

const serverNullUser = (): AuthUser | null => null;
const serverNullPerms = (): AuthPerms | null => null;
const serverFalse = () => false;

type SessionCtx = {
  user: AuthUser | null;
  perms: AuthPerms | null;
  email: string | null;
  hydrated: boolean;
  validating: boolean;
  signIn: (user: AuthUser, perms?: AuthPerms) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = React.useSyncExternalStore(
    subscribe,
    cachedGetUserSnapshot,
    serverNullUser
  );
  const perms = React.useSyncExternalStore(
    subscribe,
    cachedGetPermsSnapshot,
    serverNullPerms
  );
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    serverFalse
  );
  const [validatedUserId, setValidatedUserId] = React.useState<number | null>(
    null
  );
  const validating = !!user && hydrated && validatedUserId !== user.id;

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
    if (!hydrated || !user) return;
    let cancelled = false;
    authApi
      .getProfile()
      .catch(() => {
        if (cancelled) return;
        // If cookie is invalid or expired, clear session
        localStorage.removeItem(KEY);
        localStorage.removeItem(PERMS_KEY);
        emit();
      })
      .finally(() => {
        if (!cancelled) setValidatedUserId(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, user]);

  const value = React.useMemo(
    () => ({
      user,
      perms,
      email: user?.email ?? null,
      hydrated,
      validating,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, perms, hydrated, validating, signIn, signOut, refreshProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = React.useContext(Ctx);
  if (!v)
    throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  return v;
}

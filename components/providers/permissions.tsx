"use client";

import * as React from "react";

import type { UmModule, UmPerm, UmUser } from "@/lib/data/users";
import {
  effectivePerms,
  EMPTY_PERMS,
  isSuperRole,
  can as rawCan,
} from "@/lib/rbac";
import { useAppStore } from "@/components/providers/app-store";
import { useSession } from "@/components/providers/session";

export type Permissions = {
  user: UmUser | null;
  perms: Record<UmModule, UmPerm>;
  isSuper: boolean;
  ready: boolean;
  can: (module: UmModule, need?: Exclude<UmPerm, "none">) => boolean;
};

export function usePermissions(): Permissions {
  const {
    user: sessionUser,
    perms: sessionPerms,
    email,
    hydrated,
  } = useSession();
  const { umUsers, umRoles } = useAppStore();

  return React.useMemo(() => {
    // Priority: sessionUser from backend session, fallback to umUsers matching email
    const storeUser =
      email == null
        ? null
        : (umUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
          null);

    const user: UmUser | null = sessionUser
      ? {
          id: String(sessionUser.id),
          nik: sessionUser.nik || "",
          kar: sessionUser.kar,
          email: sessionUser.email,
          roles: sessionUser.roles || [],
          on: sessionUser.on,
          pwSalt: "",
          pwHash: "",
        }
      : storeUser;

    let perms: Record<UmModule, UmPerm> = EMPTY_PERMS;
    if (hydrated) {
      if (sessionPerms && Object.keys(sessionPerms).length > 0) {
        perms = sessionPerms as Record<UmModule, UmPerm>;
      } else {
        perms = effectivePerms(user, umRoles);
      }
    }

    const isSuper =
      !!user &&
      user.on &&
      (user.roles.includes("1") ||
        umRoles.some((r) => user.roles.includes(r.id) && isSuperRole(r)));

    return {
      user,
      perms,
      isSuper,
      ready: hydrated,
      can: (module, need = "view") => rawCan(perms, module, need),
    };
  }, [sessionUser, sessionPerms, email, hydrated, umUsers, umRoles]);
}

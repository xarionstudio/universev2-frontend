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

/* Menjembatani sesi (siapa) dengan app-store (daftar user & role) menjadi
   permission efektif. Sengaja hook, bukan provider baru, agar tidak menambah
   lapisan context — cukup menurunkan dari dua sumber yang sudah ada. */

export type Permissions = {
  /* Record UmUser milik akun yang login; null bila email tidak dikenal */
  user: UmUser | null;
  perms: Record<UmModule, UmPerm>;
  /* Punya role terkunci (Superadmin) — akses penuh ke semua modul */
  isSuper: boolean;
  /* false selama sesi belum terbaca; jangan ambil keputusan redirect dulu */
  ready: boolean;
  can: (module: UmModule, need?: Exclude<UmPerm, "none">) => boolean;
};

export function usePermissions(): Permissions {
  const { email, hydrated } = useSession();
  const { umUsers, umRoles } = useAppStore();

  return React.useMemo(() => {
    const user =
      email == null
        ? null
        : (umUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
          null);

    const perms = hydrated ? effectivePerms(user, umRoles) : EMPTY_PERMS;
    const isSuper =
      !!user &&
      user.on &&
      umRoles.some((r) => user.roles.includes(r.id) && isSuperRole(r));

    return {
      user,
      perms,
      isSuper,
      ready: hydrated,
      can: (module, need = "view") => rawCan(perms, module, need),
    };
  }, [email, hydrated, umUsers, umRoles]);
}

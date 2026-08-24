"use client";

import * as React from "react";

import { toPermMap, toUmRoles, toUmUser } from "@/lib/api/adapters";
import type { UmModule, UmPerm, UmRole, UmUser } from "@/lib/data/users";
import { EMPTY_PERMS, can as rawCan, type PermMap } from "@/lib/rbac";
import { useSession } from "@/components/providers/session";

/* Menurunkan sesi menjadi jawaban can().

   Dulu hook ini menghitung sendiri permission efektif dengan menggabungkan
   role dari daftar mock di app-store. Sekarang penggabungan itu terjadi di
   server (RoleRepo.GetPermissionsForRoles), dan hasilnya ikut dalam respons
   login — jadi di sini tinggal menerjemahkan nama modul backend ke PermMap
   frontend lewat lib/api/adapters.

   Tetap hook, bukan provider baru: tidak ada state sendiri yang perlu
   disimpan, semuanya turunan dari <SessionProvider>.

   CATATAN KEAMANAN: sama seperti sebelumnya, seluruh pengecekan di sini
   berjalan di klien dan hanya mengatur apa yang DITAMPILKAN. Penegakannya ada
   di internal/middleware/rbac.go — dan sekarang benar-benar ada, jadi
   melewati pengecekan ini lewat devtools tidak lagi membuka data apa pun. */

export type Permissions = {
  /* Akun yang login dalam bentuk UmUser yang sudah dipakai halaman-halaman
     lama; null bila belum login. */
  user: UmUser | null;
  perms: PermMap;
  /* Daftar role lengkap — untuk menampilkan nama role. Kosong bila akun tidak
     punya permission `users:view`. */
  roles: UmRole[];
  /* Punya role terkunci (Superadmin). Hanya bisa dipastikan bila daftar role
     berhasil dimuat; lihat catatan di bawah. */
  isSuper: boolean;
  /* false selama sesi belum terbaca; jangan ambil keputusan redirect dulu. */
  ready: boolean;
  can: (module: UmModule, need?: Exclude<UmPerm, "none">) => boolean;
};

export function usePermissions(): Permissions {
  const {
    user: apiUser,
    perms: apiPerms,
    roles: apiRoles,
    hydrated,
  } = useSession();

  return React.useMemo(() => {
    const user = toUmUser(apiUser);
    const perms = hydrated && user ? toPermMap(apiPerms) : EMPTY_PERMS;
    const roles = toUmRoles(apiRoles);

    /* Role terkunci = Superadmin, kontrak yang sudah dinyatakan di i18n
       `umLockedNote`. Penandanya hanya ada di objek role, dan daftar role
       sendiri berada di balik permission `users:view`.

       Konsekuensinya: bila daftar role gagal dimuat, isSuper bernilai false.
       Itu aman — Superadmin pada seed backend selalu punya `users: manage`,
       jadi akun yang benar-benar super pasti bisa memuatnya. Yang tidak bisa
       memuatnya memang bukan Superadmin. */
    const isSuper =
      !!user &&
      user.on &&
      roles.some((r) => r.locked && user.roles.includes(r.id));

    return {
      user,
      perms,
      roles,
      isSuper,
      ready: hydrated,
      can: (module, need = "view") => rawCan(perms, module, need),
    };
  }, [apiUser, apiPerms, apiRoles, hydrated]);
}

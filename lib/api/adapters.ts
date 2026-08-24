/* Jembatan bentuk data backend -> bentuk yang sudah dipakai UI.

   Halaman-halaman lama (topbar, profil, users, roles, weather) sudah terlanjur
   bicara dalam tipe UmUser/UmRole/PermMap dari masa mock. Ketimbang mengubah
   semuanya sekaligus, konversinya dikumpulkan di satu berkas ini. Karena
   backend memang dirancang meniru tipe mock-nya, sebagian besar konversi
   hanya soal `id` numerik -> string.

   Saat modul-modulnya dipindah satu per satu ke API, berkas ini yang menipis,
   bukan yang membengkak. */

import {
  umModules,
  type UmModule,
  type UmPerm,
  type UmRole,
  type UmUser,
} from "@/lib/data/users";
import { EMPTY_PERMS, type PermMap } from "@/lib/rbac";

import type { ApiPermMap, ApiRole, ApiUser, PermLevel } from "./types";

/* ── Permission ──────────────────────────────────────────────────────── */

const VALID_PERMS: readonly UmPerm[] = ["none", "view", "manage"];

function asPerm(v: PermLevel | string | undefined): UmPerm {
  return VALID_PERMS.includes(v as UmPerm) ? (v as UmPerm) : "none";
}

/* Modul frontend yang tidak punya barisnya sendiri di tabel role_permissions
   backend, dipetakan ke modul yang BENAR-BENAR ditegakkan router untuk
   route-route itu.

   `fingerprint` adalah satu-satunya kasusnya saat ini: seluruh route
   /api/fingerprint/* dijaga rbac.RequirePermission("settings", ...) — lihat
   internal/router/router.go — sementara migrasi seed hanya mengisi sepuluh
   modul lain. Tanpa pemetaan ini, Superadmin sekalipun akan melihat halaman
   "tidak punya akses" di /fingerprint padahal API-nya mengizinkan.

   Kalau nanti backend menambahkan baris `fingerprint` sungguhan, nilai
   aslinya menang dan entri ini otomatis tidak terpakai. */
const MODULE_FALLBACK: Partial<Record<UmModule, UmModule>> = {
  fingerprint: "settings",
};

/* Peta permission backend -> PermMap lengkap yang dipakai lib/rbac.ts.
   Modul yang tidak disebut backend menjadi "none", bukan dibiarkan undefined,
   supaya can() tidak pernah menerima nilai kosong. */
export function toPermMap(perms: ApiPermMap | null | undefined): PermMap {
  if (!perms) return EMPTY_PERMS;

  return umModules.reduce((acc, m) => {
    const direct = perms[m];
    if (direct !== undefined) {
      acc[m] = asPerm(direct);
      return acc;
    }
    const via = MODULE_FALLBACK[m];
    acc[m] = via ? asPerm(perms[via]) : "none";
    return acc;
  }, {} as PermMap);
}

/* ── User ────────────────────────────────────────────────────────────── */

/* ApiUser -> UmUser.

   `pwSalt`/`pwHash` sengaja TIDAK diisi: backend memberi tag json:"-" pada
   keduanya, jadi digest password tidak pernah sampai ke klien. Kode UI yang
   masih memeriksa `me.pwHash` karena itu akan selalu melihat undefined — dan
   itu benar, karena verifikasi password sekarang milik server. */
export function toUmUser(u: ApiUser | null | undefined): UmUser | null {
  if (!u) return null;
  return {
    id: String(u.id),
    email: u.email,
    kar: u.kar || null,
    nik: u.nik ?? null,
    roles: u.roles ?? [],
    on: u.on,
    pwAt: u.pwAt ?? undefined,
  };
}

/* ── Role ────────────────────────────────────────────────────────────── */

export function toUmRole(r: ApiRole): UmRole {
  return {
    id: String(r.id),
    name: r.name,
    desc: r.desc ?? "",
    locked: r.locked,
    /* Perms role dipetakan lewat jalur yang sama dengan perms user, sehingga
       matriks di halaman Roles menampilkan `fingerprint` konsisten dengan
       yang benar-benar ditegakkan backend. */
    perms: toPermMap(r.perms),
  };
}

export function toUmRoles(roles: ApiRole[] | null | undefined): UmRole[] {
  return (roles ?? []).map(toUmRole);
}

/* Mesin RBAC — logika murni, tanpa React.
   Model datanya sudah ada di lib/data/users.ts (UmModule × UmPerm per role);
   berkas ini yang membuatnya benar-benar dipakai: menggabungkan permission
   dari banyak role, menjawab can(), dan memetakan route/menu ke modul.

   CATATAN KEAMANAN: seluruh pengecekan di sini berjalan di klien, jadi
   sifatnya kenyamanan UI — bukan penegakan keamanan. Selama belum ada
   backend, siapa pun yang membuka devtools bisa melewatinya. Saat API nyata
   dipasang, setiap endpoint WAJIB mengulang pengecekan yang sama di server. */

import {
  umModules,
  type UmModule,
  type UmPerm,
  type UmRole,
  type UmUser,
} from "@/lib/data/users";

/* Urutan kekuatan permission — dipakai saat menggabungkan banyak role */
const RANK: Record<UmPerm, number> = { none: 0, view: 1, manage: 2 };

export type PermMap = Record<UmModule, UmPerm>;

export const EMPTY_PERMS: PermMap = umModules.reduce((acc, m) => {
  acc[m] = "none";
  return acc;
}, {} as PermMap);

const FULL_PERMS: PermMap = umModules.reduce((acc, m) => {
  acc[m] = "manage";
  return acc;
}, {} as PermMap);

/* Role terkunci (Superadmin) selalu akses penuh — kontrak yang sudah
   dinyatakan di i18n `umLockedNote`. Dibuat eksplisit di sini supaya tetap
   benar walau matriks perms-nya suatu saat diubah. */
export function isSuperRole(role: UmRole): boolean {
  return role.locked;
}

/* Gabungan permission seluruh role milik user — yang tertinggi menang.
   User nonaktif tidak punya permission apa pun. */
export function effectivePerms(
  user: UmUser | null | undefined,
  roles: UmRole[]
): PermMap {
  if (!user || !user.on) return EMPTY_PERMS;

  const mine = roles.filter((r) => user.roles.includes(r.id));
  if (mine.some(isSuperRole)) return FULL_PERMS;

  return umModules.reduce((acc, m) => {
    let best: UmPerm = "none";
    for (const r of mine) {
      const p = r.perms[m] ?? "none";
      if (RANK[p] > RANK[best]) best = p;
    }
    acc[m] = best;
    return acc;
  }, {} as PermMap);
}

/* Apakah permission yang dimiliki memenuhi minimal yang dibutuhkan */
export function can(
  perms: PermMap,
  module: UmModule,
  need: Exclude<UmPerm, "none"> = "view"
): boolean {
  return RANK[perms[module] ?? "none"] >= RANK[need];
}

/* ---- Pemetaan route & menu ke modul ---- */

/* Halaman yang tidak terikat modul mana pun — selalu boleh diakses selama
   sudah login (profil sendiri, notifikasi, dsb). */
const MODULE_FREE = ["/profile", "/notifications"];

/* Prefix terpanjang diperiksa lebih dulu agar /roster/data tidak keburu
   cocok dengan prefix yang lebih pendek. */
const ROUTE_MODULES: [prefix: string, module: UmModule][] = [
  ["/dashboard", "dashboard"],
  ["/displays", "display"],
  ["/employees", "employees"],
  ["/roster", "roster"],
  ["/fit-to-work", "ftw"],
  ["/assets", "asset"],
  ["/prestasi", "prestasi"],
  ["/master", "master"],
  ["/users", "users"],
  ["/roles", "users"],
  ["/settings", "settings"],
];

/* Modul pemilik sebuah path. null = bebas modul (lihat MODULE_FREE) atau
   tidak dikenal — pemanggil yang memutuskan sikapnya. */
export function moduleOfPath(pathname: string): UmModule | null {
  if (MODULE_FREE.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return null;
  for (const [prefix, mod] of ROUTE_MODULES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return mod;
  }
  return null;
}

/* Modul pemilik sebuah item nav. `key` nav sengaja disamakan dengan UmModule,
   kecuali "um" yang visKey-nya "users" — karena itu visKey didahulukan. */
export function moduleOfNav(item: {
  key: string;
  visKey?: string;
}): UmModule | null {
  const raw = item.visKey ?? item.key;
  return (umModules as string[]).includes(raw) ? (raw as UmModule) : null;
}

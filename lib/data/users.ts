/* Tipe User Management (akun login) + Role RBAC per modul.

   Data-nya sudah TIDAK tinggal di berkas ini. Seed `initialUmUsers` /
   `initialUmRoles` yang dulu menjadi cermin migrasi backend telah dihapus:
   halaman Users & Roles kini menghidrasi app-store langsung dari
   GET /api/users dan GET /api/roles lewat adapter di lib/api/adapters.ts
   (ADR 0013), sedangkan sesi login membawa user + permission-nya sendiri
   (components/providers/session).

   `id` pada kedua tipe adalah id numerik backend dalam bentuk string
   (String(ApiUser.id) / String(ApiRole.id)) — bukan lagi "u1"/"r1" era mock.
   Karena itu perbandingan seperti `me.id === target.id` (penjaga "jangan
   nonaktifkan akun sendiri") tetap cocok antara sesi dan daftar hasil
   hidrasi. */

export type UmPerm = "none" | "view" | "manage";

export type UmModule =
  | "dashboard"
  | "display"
  | "employees"
  /* `medical` = Riwayat Medis karyawan (med_history + med_monitor) — modul
     per-FIELD, bukan per-route: route-nya tetap milik `employees`, tapi
     backend mengosongkan kedua field itu bagi yang tidak memegang medical
     (migrasi 000030: Superadmin & role Management). */
  | "medical"
  | "roster"
  | "fingerprint"
  | "ftw"
  | "asset"
  | "prestasi"
  | "master"
  | "users"
  | "settings";

export const umModules: UmModule[] = [
  "dashboard",
  "display",
  "employees",
  "medical",
  "roster",
  "fingerprint",
  "ftw",
  "asset",
  "prestasi",
  "master",
  "users",
  "settings",
];

export type UmUser = {
  id: string;
  email: string;
  kar: string | null;
  nik: string | null;
  roles: string[];
  on: boolean;
  /* ISO timestamp terakhir password diubah (password_changed_at backend) —
     dipakai kolom "Password". Digest password sendiri bertag json:"-" di
     backend, jadi tidak pernah sampai ke klien; lihat lib/api/adapters.ts. */
  pwAt?: string;
};

export type UmRole = {
  id: string;
  name: string;
  desc: string;
  locked: boolean;
  perms: Record<UmModule, UmPerm>;
};

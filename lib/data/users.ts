/* User Management (akun login) + Role RBAC per modul — dari desain.

   Halaman Users & Roles masih memakai data di berkas ini; yang sudah pindah
   ke backend adalah sesi dan permission (lihat components/providers/session).

   Karena itu ID di sini DISAMAKAN dengan seed backend (migrations/000002):
   user 1..5 dan role 1..3, bukan lagi "u1"/"r1". Alasannya konkret —
   usePermissions().user sekarang berisi user sungguhan dari API, sementara
   tabel di halaman Users masih membaca daftar mock. Tanpa ID yang sama,
   perbandingan seperti `me.id === target.id` (penjaga "jangan nonaktifkan
   akun sendiri") tidak akan pernah cocok dan penjaganya mati diam-diam.

   Email dan NIK di bawah juga sudah sama persis dengan seed backend, jadi
   berkas ini adalah cermin dari data sungguhan sampai kedua halaman itu
   dipindah memakai usersApi/rolesApi. */

export type UmPerm = "none" | "view" | "manage";

export type UmModule =
  | "dashboard"
  | "display"
  | "employees"
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
  /* Kredensial — HANYA digest, tidak pernah password apa adanya, dan tidak
     pernah dikirim balik ke form. Kosong = belum pernah diatur (user sudah
     diundang tapi belum memasang password); lihat lib/password.ts. */
  pwSalt?: string;
  pwHash?: string;
  /* ISO timestamp terakhir password diubah — dipakai kolom "Password" */
  pwAt?: string;
};

export type UmRole = {
  id: string;
  name: string;
  desc: string;
  locked: boolean;
  perms: Record<UmModule, UmPerm>;
};

export const initialUmUsers: UmUser[] = [
  {
    id: "1",
    email: "angel@unggul.co.id",
    kar: "First Angel Paustine",
    nik: "503264133",
    roles: ["1"],
    on: true,
  },
  {
    id: "2",
    email: "rahmat.h@unggul.co.id",
    kar: "Rahmat Hidayat",
    nik: "503264134",
    roles: ["2"],
    on: true,
  },
  {
    id: "3",
    email: "dewi.l@unggul.co.id",
    kar: "Dewi Lestari",
    nik: "503264138",
    roles: ["2"],
    on: true,
  },
  {
    id: "4",
    email: "clinic@unggul.co.id",
    kar: null,
    nik: null,
    roles: ["3"],
    on: true,
  },
  {
    id: "5",
    email: "budi.plant@unggul.co.id",
    kar: "Hendra Gunawan",
    nik: "503264143",
    roles: ["3"],
    on: false,
  },
];

export const initialUmRoles: UmRole[] = [
  {
    id: "1",
    name: "Superadmin",
    desc: "Semua modul + user & role",
    locked: true,
    perms: {
      dashboard: "manage",
      display: "manage",
      employees: "manage",
      roster: "manage",
      fingerprint: "manage",
      ftw: "manage",
      asset: "manage",
      prestasi: "manage",
      master: "manage",
      users: "manage",
      settings: "manage",
    },
  },
  {
    id: "2",
    name: "Admin",
    desc: "Operasional harian — roster, fit to work, fleet, master",
    locked: false,
    perms: {
      dashboard: "view",
      display: "manage",
      employees: "manage",
      roster: "manage",
      fingerprint: "manage",
      ftw: "manage",
      asset: "manage",
      prestasi: "view",
      master: "manage",
      users: "none",
      settings: "none",
    },
  },
  {
    id: "3",
    name: "Viewer",
    desc: "Hanya lihat — tanpa aksi ubah",
    locked: false,
    perms: {
      dashboard: "view",
      display: "none",
      employees: "view",
      roster: "view",
      /* Viewer sebelumnya tidak bisa melihat registry ini sama sekali (dulu
         di bawah modul display yang "none" untuknya). Dibiarkan none: promosi
         menu jangan diam-diam membuka alamat IP mesin ke role read-only. */
      fingerprint: "none",
      ftw: "view",
      asset: "view",
      prestasi: "view",
      master: "view",
      users: "none",
      settings: "none",
    },
  },
];

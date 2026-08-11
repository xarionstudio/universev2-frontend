/* User Management (akun login) + Role RBAC per modul — diambil dari backend
   API GET /api/users dan GET /api/roles. */

export type UmPerm = "none" | "view" | "manage";

export type UmModule =
  | "dashboard"
  | "display"
  | "employees"
  | "roster"
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

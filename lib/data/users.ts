/* User Management (akun login) + Role RBAC per modul — dari desain */

export type UmPerm = "none" | "view" | "manage"

export type UmModule =
  | "dashboard"
  | "display"
  | "employees"
  | "roster"
  | "ftw"
  | "asset"
  | "master"
  | "users"
  | "settings"

export const umModules: UmModule[] = [
  "dashboard",
  "display",
  "employees",
  "roster",
  "ftw",
  "asset",
  "master",
  "users",
  "settings",
]

export type UmUser = {
  id: string
  email: string
  kar: string | null
  nik: string | null
  roles: string[]
  on: boolean
}

export type UmRole = {
  id: string
  name: string
  desc: string
  locked: boolean
  perms: Record<UmModule, UmPerm>
}

export const initialUmUsers: UmUser[] = [
  { id: "u1", email: "angel@unggul.co.id", kar: "First Angel Paustine", nik: "503264133", roles: ["r1"], on: true },
  { id: "u2", email: "rahmat.h@unggul.co.id", kar: "Rahmat Hidayat", nik: "503264134", roles: ["r2"], on: true },
  { id: "u3", email: "dewi.l@unggul.co.id", kar: "Dewi Lestari", nik: "503264138", roles: ["r2"], on: true },
  { id: "u4", email: "clinic@unggul.co.id", kar: null, nik: null, roles: ["r3"], on: true },
  { id: "u5", email: "budi.plant@unggul.co.id", kar: "Hendra Gunawan", nik: "503264143", roles: ["r3"], on: false },
]

export const initialUmRoles: UmRole[] = [
  {
    id: "r1",
    name: "Superadmin",
    desc: "Semua modul + user & role",
    locked: true,
    perms: { dashboard: "manage", display: "manage", employees: "manage", roster: "manage", ftw: "manage", asset: "manage", master: "manage", users: "manage", settings: "manage" },
  },
  {
    id: "r2",
    name: "Admin",
    desc: "Operasional harian — roster, fit to work, fleet, master",
    locked: false,
    perms: { dashboard: "view", display: "manage", employees: "manage", roster: "manage", ftw: "manage", asset: "manage", master: "manage", users: "none", settings: "none" },
  },
  {
    id: "r3",
    name: "Viewer",
    desc: "Hanya lihat — tanpa aksi ubah",
    locked: false,
    perms: { dashboard: "view", display: "none", employees: "view", roster: "view", ftw: "view", asset: "view", master: "view", users: "none", settings: "none" },
  },
]

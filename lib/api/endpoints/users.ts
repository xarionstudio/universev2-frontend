/* Modul User & Role — grup `/api/users` dan `/api/roles`.

   Keduanya dijaga permission modul `users` (view untuk baca, manage untuk
   ubah), jadi role non-admin akan menerima 403 di semua fungsi di berkas ini.
   Itu perilaku yang benar dan harus ditangani pemanggil — jangan diam-diam
   dijadikan daftar kosong. */

import { api, requestBlob } from "../client";
import type { ApiPermMap, ApiRole, ApiUser } from "../types";

/* ── Users ───────────────────────────────────────────────────────────── */

export type CreateUserBody = {
  name: string;
  email: string;
  nik: string;
  password: string;
  /* ID role numerik sebagai string, mis. ["2"]. Minimal satu. */
  roles: string[];
};

/* `password` opsional saat mengubah — dikosongkan berarti tidak diganti. */
export type UpdateUserBody = {
  name: string;
  email: string;
  nik: string;
  password?: string;
  roles: string[];
};

/* GET /api/users — array polos, bukan objek berpaginasi. */
export function listUsers(): Promise<ApiUser[]> {
  return api.get<ApiUser[]>("/users/");
}

/* POST /api/users */
export function createUser(body: CreateUserBody): Promise<ApiUser> {
  return api.post<ApiUser>("/users/", body);
}

/* PUT /api/users/:id */
export function updateUser(
  id: string | number,
  body: UpdateUserBody
): Promise<void> {
  return api.put<void>(`/users/${id}`, body);
}

/* PATCH /api/users/:id/status — mengaktifkan/menonaktifkan akun.
   Body-nya `active`, bukan `on`: field `on` hanya nama JSON saat user DIBACA
   (model.User.IsActive), sedangkan handler ini mengurai struct-nya sendiri. */
export function toggleUserStatus(
  id: string | number,
  active: boolean
): Promise<void> {
  return api.patch<void>(`/users/${id}/status`, { active });
}

/* DELETE /api/users/:id */
export function deleteUser(id: string | number): Promise<void> {
  return api.del<void>(`/users/${id}`);
}

/* POST /api/users/import — berkas Excel, field form bernama `file`. */
export function importUsers(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>("/users/import", fd);
}

/* GET /api/users/export — Excel, bukan JSON. */
export function exportUsers(): Promise<Blob> {
  return requestBlob("/users/export");
}

/* ── Roles ───────────────────────────────────────────────────────────── */

export type RoleBody = {
  name: string;
  perms: ApiPermMap;
};

/* GET /api/roles */
export function listRoles(): Promise<ApiRole[]> {
  return api.get<ApiRole[]>("/roles/");
}

/* POST /api/roles */
export function createRole(body: RoleBody): Promise<ApiRole> {
  return api.post<ApiRole>("/roles/", body);
}

/* PUT /api/roles/:id — role terkunci (Superadmin) ditolak backend dengan 403. */
export function updateRole(id: string | number, body: RoleBody): Promise<void> {
  return api.put<void>(`/roles/${id}`, body);
}

/* DELETE /api/roles/:id */
export function deleteRole(id: string | number): Promise<void> {
  return api.del<void>(`/roles/${id}`);
}

/* GET /api/roles/export */
export function exportRoles(): Promise<Blob> {
  return requestBlob("/roles/export");
}

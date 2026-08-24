/* Modul profil — grup `/api/profile`, di dalam AuthMiddleware.

   Selalu bekerja pada akun yang sedang login: backend membaca ID-nya dari
   klaim token, bukan dari parameter. Karena itu tidak ada endpoint
   "profil milik user lain" di sini — itu urusan modul users. */

import { api } from "../client";
import type { ApiUser, UpdatePasswordBody, UpdateProfileBody } from "../types";

/* GET /api/profile */
export function getProfile(): Promise<ApiUser> {
  return api.get<ApiUser>("/profile/");
}

/* PUT /api/profile — hanya nama & email. Tidak mengembalikan user yang sudah
   diperbarui (data-nya null), jadi pemanggil yang menambal state lokalnya. */
export function updateProfile(body: UpdateProfileBody): Promise<void> {
  return api.put<void>("/profile/", body);
}

/* PUT /api/profile/password

   Ketiga field wajib diisi: backend memverifikasi password lama dan
   mencocokkan konfirmasi. Semuanya dikirim polos — server yang meng-hash. */
export function updatePassword(body: UpdatePasswordBody): Promise<void> {
  return api.put<void>("/profile/password", body);
}

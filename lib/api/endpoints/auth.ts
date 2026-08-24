/* Modul auth — internal/router/router.go, grup `/api/auth`.

   Tiga endpoint pertama publik (di luar AuthMiddleware); hanya logout yang
   berada di dalam grup terlindungi. */

import { request } from "../client";
import type { ApiUser, AuthPayload, LoginBody, RegisterBody } from "../types";
import type { ApiAuthSlide } from "./settings";

/* internal/model/settings.go — AuthPageConfig */
export type AuthPageConfig = {
  slides: ApiAuthSlide[];
  positions: string[];
  departments: string[];
};

/* POST /api/auth/login

   Password dikirim APA ADANYA — hashing terjadi di server (lihat
   internal/pkg/hash.go). Ini kebalikan dari lib/password.ts yang meng-hash di
   browser untuk kebutuhan mock; pola mock itu TIDAK boleh dipakai di sini,
   karena backend akan meng-hash ulang kiriman kita dan hasilnya tidak akan
   pernah cocok dengan digest tersimpan.

   `noRetry` supaya kredensial yang salah (401) tidak memicu auto-refresh. */
export function login(body: LoginBody): Promise<AuthPayload> {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body,
    noRetry: true,
  });
}

/* POST /api/auth/register

   Mengembalikan user yang dibuat, BUKAN token — pengguna tetap harus login
   setelahnya. Akun baru selalu diberi role "3" (Viewer) oleh backend. */
export function register(body: RegisterBody): Promise<ApiUser> {
  return request<ApiUser>("/auth/register", {
    method: "POST",
    body,
    noRetry: true,
  });
}

/* POST /api/auth/refresh

   Menerima token dari header Authorization ATAU cookie `jwt`. Dipakai saat
   aplikasi dimuat ulang untuk memastikan token & permission masih berlaku.

   Catatan: token yang sudah lewat masa berlaku tidak bisa ditukar di sini —
   ParseToken menolaknya. Endpoint ini memperpanjang sesi yang masih hidup,
   bukan menghidupkan yang sudah mati. */
export function refresh(): Promise<AuthPayload> {
  return request<AuthPayload>("/auth/refresh", {
    method: "POST",
    noRetry: true,
  });
}

/* POST /api/auth/logout — mengosongkan cookie `jwt` di sisi server.
   Token di localStorage dibersihkan terpisah oleh session-store. */
export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST", noRetry: true });
}

/* GET /api/auth/page-config — PUBLIK (di grup /auth, di luar AuthMiddleware).

   Slide untuk slideshow panel kiri + opsi Posisi/Departemen formulir register,
   semuanya yang aktif saja. Diatur superadmin lewat Settings → Halaman Auth.
   Pemanggil wajib punya fallback lokal — endpoint ini diakses sebelum login,
   saat backend bisa saja belum/tidak terjangkau. */
export function getPageConfig(signal?: AbortSignal): Promise<AuthPageConfig> {
  return request<AuthPageConfig>("/auth/page-config", {
    method: "GET",
    noRetry: true,
    /* Pengunjung tanpa sesi memanggil ini dari /register — 401 dari backend
       (mis. versi lama tanpa rute ini) tidak boleh memicu redirect ke /login. */
    publicEndpoint: true,
    signal,
  });
}

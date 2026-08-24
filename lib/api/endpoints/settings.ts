/* Modul Pengaturan — grup `/api/settings`, permission modul `settings`.

   Menampung empat hal yang berbeda: identitas aplikasi (nama, logo, menu),
   jadwal audio, perangkat display TV, dan business rules. Semuanya di bawah
   satu permission, jadi user yang boleh mengubah nama aplikasi juga boleh
   mengubah ambang batas Fit To Work. */

import { api } from "../client";

/* internal/model/settings.go — AppSettings */
export type ApiAppSettings = {
  appName: string;
  appDesc: string;
  appEnv: string;
  companyLogo: string;
  theme: string;
  lang: string;
  /* Kunci-kunci ini sejalan dengan tipe MenuVis di app-store. */
  menuVis: Record<string, boolean>;
};

/* internal/model/settings.go — AudioSchedule */
export type ApiAudioSchedule = {
  id: number;
  title: string;
  when: string;
  freq: string;
  file: string;
  active: boolean;
  displays: string[];
};

/* internal/model/settings.go — DisplayDevice.
   `fleetId` dipakai display fleet tunggal; `fleetIds` dipakai layar monitor
   yang merotasi beberapa fleet. Keduanya opsional dan tidak dipakai bersamaan. */
export type ApiDisplayDevice = {
  id: number;
  code: string;
  name: string;
  loc: string;
  content: string;
  fleetId?: number;
  fleetIds?: number[];
  rotateSec: number;
  runtext: string;
  online: boolean;
  hb: string;
  active: boolean;
};

/* internal/model/settings.go — BusinessRulesResponse */
export type ApiBusinessRule = {
  category: string;
  rules: Record<string, unknown>;
};

/* internal/model/settings.go — AuthSlide.
   `imageUrl` bisa aset public frontend ("/login-bg.avif") atau hasil upload
   backend ("/uploads/auth-slides/…") — bedakan saat me-resolve URL-nya. */
export type ApiAuthSlide = {
  id: number;
  title: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

/* internal/model/settings.go — AuthFormOption */
export type AuthOptionKind = "position" | "department";
export type ApiAuthOption = {
  id: number;
  kind: AuthOptionKind;
  name: string;
  sortOrder: number;
  active: boolean;
};

/* ── Identitas aplikasi ──────────────────────────────────────────────── */

/* GET /api/settings */
export function getSettings(signal?: AbortSignal): Promise<ApiAppSettings> {
  return api.get<ApiAppSettings>("/settings/", undefined, signal);
}

/* PUT /api/settings */
export function updateSettings(body: Partial<ApiAppSettings>): Promise<void> {
  return api.put<void>("/settings/", body);
}

/* POST /api/settings/logo — field form `file`. */
export function uploadLogo(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>("/settings/logo", fd);
}

/* POST /api/settings/favicon — field form `file`. */
export function uploadFavicon(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>("/settings/favicon", fd);
}

/* ── Jadwal audio ────────────────────────────────────────────────────── */

/* GET /api/settings/audio */
export function listAudioSchedules(
  signal?: AbortSignal
): Promise<ApiAudioSchedule[]> {
  return api.get<ApiAudioSchedule[]>("/settings/audio", undefined, signal);
}

/* POST /api/settings/audio */
export function createAudioSchedule(
  body: Omit<ApiAudioSchedule, "id">
): Promise<ApiAudioSchedule> {
  return api.post<ApiAudioSchedule>("/settings/audio", body);
}

/* PUT /api/settings/audio/:id */
export function updateAudioSchedule(
  id: string | number,
  body: Partial<ApiAudioSchedule>
): Promise<void> {
  return api.put<void>(`/settings/audio/${id}`, body);
}

/* DELETE /api/settings/audio/:id */
export function deleteAudioSchedule(id: string | number): Promise<void> {
  return api.del<void>(`/settings/audio/${id}`);
}

/* ── Perangkat display TV ────────────────────────────────────────────── */

/* GET /api/settings/displays — `kind` menyaring jenis kontennya. */
export function listDisplays(
  kind?: string,
  signal?: AbortSignal
): Promise<ApiDisplayDevice[]> {
  return api.get<ApiDisplayDevice[]>("/settings/displays", { kind }, signal);
}

/* POST /api/settings/displays */
export function createDisplay(
  body: Partial<ApiDisplayDevice>
): Promise<ApiDisplayDevice> {
  return api.post<ApiDisplayDevice>("/settings/displays", body);
}

/* PUT /api/settings/displays/:id */
export function updateDisplay(
  id: string | number,
  body: Partial<ApiDisplayDevice>
): Promise<void> {
  return api.put<void>(`/settings/displays/${id}`, body);
}

/* DELETE /api/settings/displays/:id */
export function deleteDisplay(id: string | number): Promise<void> {
  return api.del<void>(`/settings/displays/${id}`);
}

/* GET /api/displays/:code/heartbeat

   PERHATIAN: satu-satunya route TERBUKA di seluruh router selain /auth/* dan
   /health — didaftarkan langsung pada grup `api`, bukan `protected`. Memang
   begitu rancangannya: layar TV kiosk memanggilnya tanpa pernah login. */
export function pingDisplayHeartbeat(code: string): Promise<unknown> {
  return api.get<unknown>(`/displays/${encodeURIComponent(code)}/heartbeat`);
}

/* ── Halaman auth (slideshow login/register + opsi registrasi) ───────── */

/* GET /api/settings/auth-slides — semua slide, termasuk yang nonaktif. */
export function listAuthSlides(signal?: AbortSignal): Promise<ApiAuthSlide[]> {
  return api.get<ApiAuthSlide[]>("/settings/auth-slides", undefined, signal);
}

/* POST /api/settings/auth-slides — multipart, field `file` + `title`.
   Backend menaruh slide baru di urutan paling belakang. */
export function createAuthSlide(
  file: File,
  title: string
): Promise<ApiAuthSlide> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", title);
  return api.post<ApiAuthSlide>("/settings/auth-slides", fd);
}

/* PUT /api/settings/auth-slides/:id — hanya title/sortOrder/active yang
   tersimpan; ganti gambar berarti hapus lalu upload baru. */
export function updateAuthSlide(
  id: string | number,
  body: Pick<ApiAuthSlide, "title" | "sortOrder" | "active">
): Promise<void> {
  return api.put<void>(`/settings/auth-slides/${id}`, body);
}

/* DELETE /api/settings/auth-slides/:id — berkas upload ikut dihapus server. */
export function deleteAuthSlide(id: string | number): Promise<void> {
  return api.del<void>(`/settings/auth-slides/${id}`);
}

/* GET /api/settings/auth-options — tanpa `kind` mengembalikan keduanya. */
export function listAuthOptions(
  kind?: AuthOptionKind,
  signal?: AbortSignal
): Promise<ApiAuthOption[]> {
  return api.get<ApiAuthOption[]>("/settings/auth-options", { kind }, signal);
}

/* POST /api/settings/auth-options */
export function createAuthOption(body: {
  kind: AuthOptionKind;
  name: string;
}): Promise<ApiAuthOption> {
  return api.post<ApiAuthOption>("/settings/auth-options", body);
}

/* PUT /api/settings/auth-options/:id — `name` wajib ikut dikirim walau hanya
   men-toggle `active` (backend menyimpan name/sortOrder/active sekaligus). */
export function updateAuthOption(
  id: string | number,
  body: Pick<ApiAuthOption, "name" | "sortOrder" | "active">
): Promise<void> {
  return api.put<void>(`/settings/auth-options/${id}`, body);
}

/* DELETE /api/settings/auth-options/:id */
export function deleteAuthOption(id: string | number): Promise<void> {
  return api.del<void>(`/settings/auth-options/${id}`);
}

/* ── Business rules ──────────────────────────────────────────────────── */

/* GET /api/settings/business-rules */
export function listBusinessRules(
  signal?: AbortSignal
): Promise<ApiBusinessRule[]> {
  return api.get<ApiBusinessRule[]>(
    "/settings/business-rules",
    undefined,
    signal
  );
}

/* GET /api/settings/business-rules/:category

   Kategori `ftw` inilah sumber ambang batas menit tidur yang dipakai
   POST /ftw/evaluate — jangan menyalin angkanya ke frontend. */
export function getBusinessRule(category: string): Promise<ApiBusinessRule> {
  return api.get<ApiBusinessRule>(`/settings/business-rules/${category}`);
}

/* PUT /api/settings/business-rules/:category — body adalah peta aturannya
   langsung, bukan dibungkus { rules: ... }. */
export function upsertBusinessRule(
  category: string,
  rules: Record<string, unknown>
): Promise<void> {
  return api.put<void>(`/settings/business-rules/${category}`, rules);
}

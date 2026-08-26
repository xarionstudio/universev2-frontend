/* Modul-modul kecil yang tidak cukup besar untuk berkas sendiri:
   dashboard, display TV, notifikasi, prestasi, fingerprint, dan proksi cuaca. */

import { api } from "../client";
import type { ListQuery } from "../types";

/* ── Dashboard ───────────────────────────────────────────────────────── */

/* GET /api/dashboard/summary — permission modul `dashboard`.

   Handler-nya merakit fiber.Map dari enam repositori sekaligus, bukan sebuah
   model tetap, jadi bentuknya tidak ikut berubah otomatis saat backend
   berubah. Ketik ulang dengan tipe konkret saat halaman dashboard dipindah
   dari mock — sumbernya internal/service/dashboard_service.go. */
export function getDashboardSummary(
  q?: { date?: string },
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>("/dashboard/summary", q, signal);
}

/* ── Display TV ──────────────────────────────────────────────────────── */

/* Semua endpoint display berada di bawah permission modul `display` DAN di
   dalam AuthMiddleware — layar kiosk tetap harus membawa token. Satu-satunya
   yang terbuka adalah heartbeat di endpoints/settings.ts. */

/* GET /api/display/attendance */
export function getDisplayAttendance(signal?: AbortSignal): Promise<unknown[]> {
  return api.get<unknown[]>("/display/attendance", undefined, signal);
}

/* GET /api/display/ftw */
export function getDisplayFtw(signal?: AbortSignal): Promise<unknown[]> {
  return api.get<unknown[]>("/display/ftw", undefined, signal);
}

/* GET /api/display/fleet */
export function getDisplayFleet(
  q?: { fleetId?: string; shift?: string; date?: string },
  signal?: AbortSignal
): Promise<unknown[]> {
  return api.get<unknown[]>("/display/fleet", q, signal);
}

/* GET /api/display/monitor — `monitor` adalah kode perangkat display. */
export function getDisplayMonitor(
  monitor?: string,
  signal?: AbortSignal
): Promise<unknown[]> {
  return api.get<unknown[]>("/display/monitor", { monitor }, signal);
}

/* internal/service/display_service.go — DisplayFpDevice. Bentuknya sengaja
   dibuat backend sama persis dengan DisplayMachine di
   lib/data/display-screens.ts: `id` adalah KODE mesin (mis. "FP-07"), bukan
   id numerik tabel — kiosk tidak pernah menerima alamat jaringan (ADR 0009). */
export type ApiDisplayFpDevice = {
  id: string;
  loc: string;
  online: boolean;
  meta: string;
};

/* GET /api/display/fingerprint — hanya mesin aktif, belum terurut;
   pengurutan kartu milik klien (fpDisplayMachines). */
export function getDisplayFingerprint(
  signal?: AbortSignal
): Promise<ApiDisplayFpDevice[]> {
  return api.get<ApiDisplayFpDevice[]>(
    "/display/fingerprint",
    undefined,
    signal
  );
}

/* ── Notifikasi ──────────────────────────────────────────────────────── */

/* internal/model/notification.go */
export type ApiNotification = {
  id: number;
  userId?: number;
  tone: "info" | "success" | "warning" | "danger";
  textId: string;
  textEn: string;
  timeId: string;
  timeEn: string;
  read: boolean;
  createdAt: string;
};

/* GET /api/notifications — TANPA pengecekan permission modul; cukup login.
   Sama seperti /profile, ini memang milik akun yang bersangkutan. */
export function listNotifications(
  q?: ListQuery,
  signal?: AbortSignal
): Promise<ApiNotification[]> {
  return api.get<ApiNotification[]>("/notifications/", q, signal);
}

/* PUT /api/notifications/:id/read */
export function markNotificationRead(id: string | number): Promise<void> {
  return api.put<void>(`/notifications/${id}/read`);
}

/* PUT /api/notifications/read-all

   Perhatikan urutan pendaftaran route di router.go: `/:id/read` didaftarkan
   LEBIH DULU daripada `/read-all`. Selama backend memakai path ini apa adanya
   tidak ada masalah, tapi jangan mengirim id literal "read-all". */
export function markAllNotificationsRead(): Promise<void> {
  return api.put<void>("/notifications/read-all");
}

/* ── Prestasi ────────────────────────────────────────────────────────── */

/* internal/model/prestasi.go — PrestasiRecord */
export type ApiPrestasiRecord = {
  nik: string;
  name: string;
  dept: string;
  pos: string;
  foto?: string;
  rank: number;
  points: number;
  bestStreak: number;
  currentStreak: number;
  attCount: number;
  sleepPct: number;
  attRate: number;
  sleepRate: number;
  avgSleepMin: number;
  badges: string[];
  lateCount: number;
  penaltyDays: number;
  qualifiedDays: number;
  scheduledDays: number;
  coverDays: number;
  days?: unknown[];
};

/* GET /api/prestasi/leaderboard — `days` default 30. */
export function getLeaderboard(
  q?: { days?: number },
  signal?: AbortSignal
): Promise<ApiPrestasiRecord[]> {
  return api.get<ApiPrestasiRecord[]>("/prestasi/leaderboard", q, signal);
}

/* GET /api/prestasi/:nik/history — `days` default 90 di endpoint ini,
   berbeda dari leaderboard. */
export function getOperatorPrestasi(
  nik: string,
  q?: { days?: number },
  signal?: AbortSignal
): Promise<ApiPrestasiRecord> {
  return api.get<ApiPrestasiRecord>(
    `/prestasi/${encodeURIComponent(nik)}/history`,
    q,
    signal
  );
}

/* POST /api/prestasi/recalculate — menghitung ulang seluruh skor. */
export function recalculatePrestasi(days?: number): Promise<unknown> {
  return api.post<unknown>("/prestasi/recalculate", undefined, { days });
}

/* ── Perangkat fingerprint ───────────────────────────────────────────── */

/* internal/model/fingerprint.go — penamaannya camelCase penuh di sini
   (ipAddress, isOnline), berbeda dari model lain yang serba singkat. */
export type ApiFingerprintDevice = {
  id: number;
  code: string;
  name: string;
  ipAddress: string;
  port: number;
  comKey: number;
  location: string;
  isOnline: boolean;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/* GET /api/fingerprint/devices

   Dijaga permission modul `settings`, BUKAN `fingerprint`. Modul
   `fingerprint` tidak pernah ada di tabel role_permissions — lihat catatan
   di lib/rbac.ts soal bagaimana frontend menjembataninya. */
export function listFingerprintDevices(
  signal?: AbortSignal
): Promise<ApiFingerprintDevice[]> {
  return api.get<ApiFingerprintDevice[]>(
    "/fingerprint/devices",
    undefined,
    signal
  );
}

export type FingerprintDeviceBody = {
  code: string;
  name: string;
  ipAddress: string;
  port: number;
  comKey?: number;
  location?: string;
  isActive?: boolean;
};

/* POST /api/fingerprint/devices */
export function createFingerprintDevice(
  body: FingerprintDeviceBody
): Promise<ApiFingerprintDevice> {
  return api.post<ApiFingerprintDevice>("/fingerprint/devices", body);
}

/* PUT /api/fingerprint/devices/:id — mengembalikan baris hasil perubahan.

   Handler-nya partial update ber-pointer (updateDeviceRequest di
   fingerprint.go): field yang DILEWATKAN dipertahankan, string kosong/angka
   nol pada field wajib juga diabaikan. isActive tetap diwajibkan di tipe body
   ini sebagai pilihan desain — status aktif adalah toggle yang niatnya harus
   selalu tersurat dari form, bukan karena melewatkannya berbahaya. */
export function updateFingerprintDevice(
  id: string | number,
  body: Partial<FingerprintDeviceBody> & { isActive: boolean }
): Promise<ApiFingerprintDevice> {
  return api.put<ApiFingerprintDevice>(`/fingerprint/devices/${id}`, body);
}

/* DELETE /api/fingerprint/devices/:id */
export function deleteFingerprintDevice(id: string | number): Promise<void> {
  return api.del<void>(`/fingerprint/devices/${id}`);
}

/* POST /api/fingerprint/sync — memicu worker menarik data sekarang.
   Worker hanya berjalan bila FINGERPRINT_ENABLED=true di .env backend.
   Bisa lama: mesin dijalani berurutan dan yang offline menghabiskan timeout
   ~3 detik per perangkat — pemanggil wajib menampilkan keadaan menunggu. */
export function syncFingerprintNow(): Promise<{ totalSynced: number }> {
  return api.post<{ totalSynced: number }>("/fingerprint/sync");
}

/* ── Cuaca ───────────────────────────────────────────────────────────── */

/* GET /api/weather/current

   Proksi ke Open-Meteo, meneruskan responsnya apa adanya. Bedanya dengan
   lib/weather/open-meteo.ts yang memanggil Open-Meteo langsung dari browser:
   lewat sini kunci/kuota dan CORS jadi urusan server. Default koordinatnya
   Samarinda (-0.5021, 117.1536). */
export function getCurrentWeather(
  lat?: number | string,
  lon?: number | string,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/weather/current",
    { lat, lon },
    signal
  );
}

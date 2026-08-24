/* Modul Aset / Fleet — permission modul `asset`.

   Route-nya tersebar di tiga akar, bukan satu grup:
     /api/fleet/...      setting fleet & alokasi operator
     /api/units/...      status unit dan riwayatnya
     /api/units/db/...   database master unit
   Pembagian itu mengikuti router.go apa adanya. */

import { api } from "../client";

export type UnitStatus = "ready" | "breakdown" | "standby";

/* internal/model/fleet.go — UnitHist adalah tuple [4]string, bukan objek:
   [when, what, why, status]. */
export type ApiUnitHist = [string, string, string, string];

/* internal/model/fleet.go — Unit (gabungan status + riwayat) */
export type ApiUnit = {
  code: string;
  type: string;
  status: UnitStatus;
  loc: string;
  upd: string;
  hist: ApiUnitHist[];
};

/* internal/model/fleet.go — FleetSetting */
export type ApiFleetSetting = {
  id: number;
  digger: string;
  loc: string;
  bus: string;
  active: boolean;
  units: string[];
};

export type FleetSettingBody = {
  digger: string;
  loc: string;
  bus: string;
  units: string[];
  active: boolean;
};

/* internal/model/fleet.go — FleetAllocResponse.
   Bentuknya bersarang tiga: tanggal -> shift -> { kodeUnit: nikOperator },
   sama persis dengan tipe FaAlloc di lib/data/fleet-alloc.ts. */
export type ApiFleetAlloc = Record<
  string,
  Record<string, Record<string, string>>
>;

/* internal/model/fleet.go — UnitDb */
export type ApiUnitDb = {
  id: number;
  code: string;
  egi: string;
  product: string;
  cls: string;
  cat: string;
  area: string;
  active: boolean;
  standby: boolean;
  breakdown: boolean;
  loc: string;
  upd: string;
  by: string;
  createdAt: string;
  updatedAt: string;
};

export type UnitDbBody = Omit<ApiUnitDb, "id" | "createdAt" | "updatedAt">;

/* ── Setting fleet ───────────────────────────────────────────────────── */

/* GET /api/fleet/settings */
export function listFleetSettings(
  signal?: AbortSignal
): Promise<ApiFleetSetting[]> {
  return api.get<ApiFleetSetting[]>("/fleet/settings", undefined, signal);
}

/* POST /api/fleet/settings */
export function createFleetSetting(
  body: FleetSettingBody
): Promise<ApiFleetSetting> {
  return api.post<ApiFleetSetting>("/fleet/settings", body);
}

/* PUT /api/fleet/settings/:id */
export function updateFleetSetting(
  id: string | number,
  body: FleetSettingBody
): Promise<void> {
  return api.put<void>(`/fleet/settings/${id}`, body);
}

/* DELETE /api/fleet/settings/:id */
export function deleteFleetSetting(id: string | number): Promise<void> {
  return api.del<void>(`/fleet/settings/${id}`);
}

/* ── Alokasi operator ────────────────────────────────────────────────── */

/* GET /api/fleet/allocations — tanpa filter, mengembalikan seluruh peta.
   `date` dan `shift` mempersempitnya. */
export function getAllocations(
  q?: { date?: string; shift?: string },
  signal?: AbortSignal
): Promise<ApiFleetAlloc> {
  return api.get<ApiFleetAlloc>("/fleet/allocations", q, signal);
}

/* POST /api/fleet/allocations/auto — server yang menyusun formasinya. */
export function autoAllocate(date: string, shift: string): Promise<unknown> {
  return api.post<unknown>("/fleet/allocations/auto", { date, shift });
}

/* PUT /api/fleet/allocations — simpan manual.
   `units` memetakan kode unit ke NIK operator; kunci yang dihilangkan berarti
   unit itu tidak beroperator. */
export function saveAllocation(body: {
  date: string;
  shift: string;
  units: Record<string, string>;
}): Promise<unknown> {
  return api.put<unknown>("/fleet/allocations", body);
}

/* ── Status unit ─────────────────────────────────────────────────────── */

/* GET /api/units/status */
export function listUnitStatuses(signal?: AbortSignal): Promise<ApiUnit[]> {
  return api.get<ApiUnit[]>("/units/status", undefined, signal);
}

/* PUT /api/units/:code/status */
export function updateUnitStatus(
  code: string,
  status: UnitStatus,
  note = ""
): Promise<void> {
  return api.put<void>(`/units/${encodeURIComponent(code)}/status`, {
    status,
    note,
  });
}

/* POST /api/units/:code/status-report — laporan breakdown; `reason` wajib. */
export function reportUnitBreakdown(
  code: string,
  reason: string
): Promise<unknown> {
  return api.post<unknown>(`/units/${encodeURIComponent(code)}/status-report`, {
    reason,
  });
}

/* GET /api/units/:code/history */
export function getUnitHistory(code: string): Promise<ApiUnitHist[]> {
  return api.get<ApiUnitHist[]>(`/units/${encodeURIComponent(code)}/history`);
}

/* ── Database unit ───────────────────────────────────────────────────── */

/* GET /api/units/db */
export function listUnitDb(
  q?: Record<string, string | number | undefined>,
  signal?: AbortSignal
): Promise<ApiUnitDb[]> {
  return api.get<ApiUnitDb[]>("/units/db", q, signal);
}

/* POST /api/units/db */
export function createUnitDb(body: UnitDbBody): Promise<ApiUnitDb> {
  return api.post<ApiUnitDb>("/units/db", body);
}

/* PUT /api/units/db — baris ditentukan oleh `code` DI DALAM body, bukan lewat
   path. Mengubah kode unit karena itu tidak mungkin lewat endpoint ini. */
export function updateUnitDb(body: UnitDbBody): Promise<void> {
  return api.put<void>("/units/db", body);
}

/* DELETE /api/units/db?code=... — kode unit lewat query, bukan path. */
export function deleteUnitDb(code: string): Promise<void> {
  return api.del<void>("/units/db", { code });
}

/* POST /api/units/db/import — field form `file` (.xlsx). */
export function importUnitDb(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>("/units/db/import", fd);
}

/* CATATAN: router tidak punya endpoint ekspor untuk modul fleet/unit —
   tombol ekspor di halaman Aset harus dibangkitkan di klien (lib/report/xlsx)
   atau menunggu endpoint baru di backend. */

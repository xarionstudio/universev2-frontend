/* Modul Roster & Absensi — grup `/api/rosters` dan `/api/attendance`.

   Keduanya dijaga permission modul `roster` (lihat router.go): grup
   /attendance sengaja TIDAK punya modul sendiri. Jadi user yang boleh melihat
   roster otomatis boleh melihat absensi. */

import { api, requestBlob } from "../client";
import type { ListQuery, Paged } from "../types";

/* internal/model/roster.go — RosterMeta.
   Perhatikan: primary key-nya bertag json `key`, bukan `id`. Semua route
   detail memakai nilai ini sebagai `:key`. */
export type ApiRosterMeta = {
  key: number;
  label: string;
  month: string;
  dept: string;
  file: string;
  emp: number;
  rows: string;
  by: string;
  dateISO: string;
  status: string;
  createdAt: string;
};

/* internal/model/roster.go — RosterRevision */
export type ApiRosterRevision = {
  id: number;
  sid: string;
  nik: string;
  name: string;
  whatId: string;
  whatEn: string;
  whenId: string;
  whenEn: string;
  /* Wajib YYYY-MM-DD saat dikirim — divalidasi backend. */
  targetDate: string;
  status: string;
  byId?: string;
  byEn?: string;
  createdAt: string;
};

/* internal/model/roster.go — AttendanceRow */
export type ApiAttendanceRow = {
  name: string;
  nik: string;
  dept: string;
  code: string;
  in: string;
  inM: string;
  out: string;
  outM: string;
  st: string;
  date?: string;
};

/* internal/model/roster.go — RosterValidationResult, hasil unggah berkas. */
export type ApiRosterValidation = {
  preview: { nik: string; name: string; codes: Record<number, string> }[];
  days: string[];
  errors: {
    row: string;
    nik: string;
    emp: string;
    issue: string;
    issueEn: string;
    badgeVariant: "danger" | "warning";
    badge: string;
  }[];
  validCount: number;
  dupCount: number;
  errCount: number;
};

/* ── Berkas roster ───────────────────────────────────────────────────── */

/* GET /api/rosters */
export function listRosters(
  q?: ListQuery,
  signal?: AbortSignal
): Promise<Paged<ApiRosterMeta>> {
  return api.get<Paged<ApiRosterMeta>>("/rosters/", q, signal);
}

/* POST /api/rosters/upload — field form `file`, hanya .xlsx/.xls/.csv. */
export function uploadRoster(file: File): Promise<ApiRosterValidation> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<ApiRosterValidation>("/rosters/upload", fd);
}

/* GET /api/rosters/:key/detail */
export function getRosterDetail(key: string | number): Promise<unknown> {
  return api.get<unknown>(`/rosters/${key}/detail`);
}

/* GET /api/rosters/:key/export */
export function exportRoster(key: string | number): Promise<Blob> {
  return requestBlob(`/rosters/${key}/export`);
}

/* GET /api/rosters/codes — daftar kode shift yang dikenal. */
export function getShiftCodes(): Promise<unknown> {
  return api.get<unknown>("/rosters/codes");
}

/* ── Revisi ──────────────────────────────────────────────────────────── */

/* GET /api/rosters/revisions */
export function listRevisions(
  q?: ListQuery,
  signal?: AbortSignal
): Promise<Paged<ApiRosterRevision>> {
  return api.get<Paged<ApiRosterRevision>>("/rosters/revisions", q, signal);
}

/* GET /api/rosters/revisions/codes */
export function getRevisionCodes(): Promise<unknown> {
  return api.get<unknown>("/rosters/revisions/codes");
}

/* POST /api/rosters/revisions/batch

   Kirim selalu dalam bentuk { revisions: [...] }. Backend juga menerima satu
   objek revisi telanjang demi kompatibilitas lama, tapi bentuk batch yang
   dipakai ke depan. `status` diabaikan — server selalu menyetelnya "pending". */
export function submitRevisions(
  revisions: Array<
    Partial<ApiRosterRevision> & { sid: string; targetDate: string }
  >
): Promise<ApiRosterRevision[]> {
  return api.post<ApiRosterRevision[]>("/rosters/revisions/batch", {
    revisions,
  });
}

/* DELETE /api/rosters/revisions/:id */
export function deleteRevision(id: string | number): Promise<void> {
  return api.del<void>(`/rosters/revisions/${id}`);
}

/* PUT /api/rosters/approvals/:id/approve */
export function approveRevision(id: string | number): Promise<void> {
  return api.put<void>(`/rosters/approvals/${id}/approve`);
}

/* PATCH /api/rosters/approvals/:id/note — menyetujui sekaligus mencatat
   alasan. Route-nya PATCH, bukan PUT seperti dua saudaranya. */
export function approveRevisionWithNote(
  id: string | number,
  note: string
): Promise<void> {
  return api.patch<void>(`/rosters/approvals/${id}/note`, { note });
}

/* PUT /api/rosters/approvals/:id/reject */
export function rejectRevision(
  id: string | number,
  note?: string
): Promise<void> {
  return api.put<void>(`/rosters/approvals/${id}/reject`, { note: note ?? "" });
}

/* ── Absensi ─────────────────────────────────────────────────────────── */

/* GET /api/rosters/attendance — absensi dalam konteks berkas roster. */
export function getRosterAttendance(
  q?: ListQuery & { date?: string },
  signal?: AbortSignal
): Promise<Paged<ApiAttendanceRow>> {
  return api.get<Paged<ApiAttendanceRow>>("/rosters/attendance", q, signal);
}

/* GET /api/attendance/today — SATU-SATUNYA endpoint absensi yang ber-amplop
   paged (handler-nya memakai response.SuccessPaged), jadi `data` berbentuk
   {items, pagination}, bukan array telanjang seperti /date dan /range.
   "Hari ini" dihitung server (zona waktu server), bukan browser. */
export function getAttendanceToday(
  signal?: AbortSignal
): Promise<Paged<ApiAttendanceRow>> {
  return api.get<Paged<ApiAttendanceRow>>(
    "/attendance/today",
    undefined,
    signal
  );
}

/* GET /api/attendance/date — `date` default hari ini di sisi server. */
export function getAttendanceByDate(
  date: string,
  signal?: AbortSignal
): Promise<ApiAttendanceRow[]> {
  return api.get<ApiAttendanceRow[]>("/attendance/date", { date }, signal);
}

/* GET /api/attendance/range — `from` dan `to` KEDUANYA wajib. */
export function getAttendanceRange(
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<ApiAttendanceRow[]> {
  return api.get<ApiAttendanceRow[]>("/attendance/range", { from, to }, signal);
}

export type CheckInOutBody = {
  nik: string;
  machine: string;
  /* Dikosongkan berarti waktu server saat permintaan diterima. */
  time?: string;
};

/* POST /api/attendance/checkin — butuh permission `roster:manage`. */
export function recordCheckIn(body: CheckInOutBody): Promise<unknown> {
  return api.post<unknown>("/attendance/checkin", body);
}

/* POST /api/attendance/checkout — butuh permission `roster:manage`. */
export function recordCheckOut(body: CheckInOutBody): Promise<unknown> {
  return api.post<unknown>("/attendance/checkout", body);
}

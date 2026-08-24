/* Modul Fit To Work — grup `/api/ftw`, permission modul `ftw`.

   Catatan RBAC yang mudah terlewat: `POST /ftw/evaluate` berada di bawah
   permission `view`, bukan `manage` — endpoint itu hanya menghitung status
   dari menit tidur tanpa menyimpan apa pun. Yang butuh `manage` hanya
   `POST /ftw/submit`. */

import { api, requestBlob } from "../client";
import type { ListQuery, Paged } from "../types";

export type FtwStatus = "fit" | "spare" | "pulang" | "belum";

/* internal/model/ftw.go — FTWRecord.
   `name` dan `dept` bertag gorm:"-": diisi service dari tabel employees, jadi
   selalu ada di respons meski bukan kolom ftw_logs. */
export type ApiFtwRecord = {
  nik: string;
  name: string;
  dept: string;
  shift: string;
  /* null = belum melapor hari itu. */
  sleepMin: number | null;
  sleep: string;
  st: FtwStatus;
  restHours: number;
  hist: number[];
  canWork: boolean;
  sendTime: string;
  date: string;
  submittedAt: string;
};

/* internal/model/ftw.go — FTWEval, hasil POST /ftw/evaluate. */
export type ApiFtwEval = {
  status: FtwStatus;
  restHours: number;
  canWork: boolean;
};

/* internal/model/ftw.go — FTWHistEntry */
export type ApiFtwHistEntry = {
  d: number;
  iso: string;
  date: string;
  st: number;
  sleepMin: number | null;
  sleep: string;
  status: FtwStatus;
  restHours: number;
  sendTime: string;
};

/* dto.SubmitFTWLogRequest. `shift` hanya menerima "pagi" atau "malam";
   `date` boleh dikosongkan (server memakai hari ini), tapi bila diisi wajib
   YYYY-MM-DD. `sleepMin` null berarti belum melapor — status jadi "belum". */
export type SubmitFtwBody = {
  nik: string;
  shift: "pagi" | "malam";
  sleepMin: number | null;
  sleep?: string;
  sendTime?: string;
  date?: string;
};

/* GET /api/ftw/today — `date` default hari ini di sisi server. */
export function getTodayFtw(
  q?: ListQuery & { date?: string; shift?: string; q?: string },
  signal?: AbortSignal
): Promise<Paged<ApiFtwRecord>> {
  return api.get<Paged<ApiFtwRecord>>("/ftw/today", q, signal);
}

/* GET /api/ftw/history

   Wajib menyertakan `nik` ATAU rentang tanggal (date_from/date_to); bila
   keduanya kosong backend menjawab 400. Dengan `nik` saja hasilnya dibatasi
   30 baris terakhir — tidak ada parameter untuk mengubah angka itu, jadi
   untuk periode lain kirim rentang tanggal.

   Mengembalikan FTWRecord, BUKAN FTWHistEntry. */
export function getFtwHistory(
  q: { nik?: string; date_from?: string; date_to?: string },
  signal?: AbortSignal
): Promise<ApiFtwRecord[]> {
  return api.get<ApiFtwRecord[]>("/ftw/history", q, signal);
}

/* POST /api/ftw/submit — butuh permission `ftw:manage`. */
export function submitFtw(body: SubmitFtwBody): Promise<ApiFtwRecord> {
  return api.post<ApiFtwRecord>("/ftw/submit", body);
}

/* POST /api/ftw/evaluate — hanya menghitung, tidak menyimpan.
   Ambang batasnya diambil dari business_rules, jadi jangan menyalin angka
   330/300/240 ke frontend; panggil endpoint ini supaya aturannya satu sumber. */
export function evaluateFtw(sleepMin: number | null): Promise<ApiFtwEval> {
  return api.post<ApiFtwEval>("/ftw/evaluate", { sleepMin });
}

/* GET /api/ftw/export */
export function exportFtw(q?: ListQuery & { date?: string }): Promise<Blob> {
  return requestBlob("/ftw/export", q);
}

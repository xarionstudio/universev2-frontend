/* Modul Master Data — grup `/api/master/:category`, permission modul `master`.

   Satu set route melayani sembilan kategori sekaligus; yang membedakan hanya
   segmen `:category`. Bentuk barisnya karena itu BERBEDA per kategori (lihat
   internal/model/master.go), jadi fungsi di sini digenerikkan dan pemanggil
   yang menyebutkan tipe barisnya. */

import { api, requestBlob } from "../client";
import type { ListQuery } from "../types";

/* Kategori yang benar-benar dikenali internal/service/master_service.go.
   Nilai di luar daftar ini ditolak backend, bukan menghasilkan daftar kosong. */
export const MASTER_CATEGORIES = [
  "egi",
  "product",
  "eqclass",
  "area",
  "tempudo",
  "bus",
  "lokasiex",
  "mess",
  "runtext",
] as const;

export type MasterCategory = (typeof MASTER_CATEGORIES)[number];

/* Field yang pasti ada di semua kategori. Sisanya spesifik: `description`
   pada eqclass, `egiType`/`departureTime` pada bus, dan seterusnya. */
export type ApiMasterEntry = {
  id: number;
  code: string;
  name: string;
  active: boolean;
  [extra: string]: unknown;
};

/* Type EGI — `eqClass` = KODE Eq. Class induk ("HD", "MH", ...); "" = belum
   terklasifikasi (mis. SPARE). Dipakai form Database Unit untuk cascade
   Eq. Class → Type EGI. Lihat docs/api/database-unit.md. */
export type ApiMasterEgi = ApiMasterEntry & {
  eqClass: string;
};

/* Eq. Class — `name` menyimpan KODE ("MH"); `description` kepanjangan. */
export type ApiMasterEqClass = ApiMasterEntry & {
  description: string;
};

/* Amplop daftar master — BUKAN Paged<T> ({items, pagination}) seperti grup
   lain: master_service membungkusnya sendiri. `search` disaring in-memory
   di server; perPage default 20, maksimum 200 (pkg/pagination). */
export type MasterList<T = ApiMasterEntry> = {
  entries: T[] | null;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  category: string;
};

/* GET /api/master/:category

   Untuk `runtext`, tiap entri punya `targetDisplay` + `textColor` (lihat
   MasterRunningText). Form Display Monitor menyaring entri aktif dengan
   target ∈ { Semua kiosk, Display Fleet, Display Monitor } — dokumentasi:
   docs/api/display-monitor.md.

   Untuk `egi` / `eqclass` / `product`, form Database Unit (Tambah/Edit Unit)
   memuat opsi dropdown — cascade Eq. Class → Type EGI memakai field
   `eqClass` pada entri egi. Dokumentasi: docs/api/database-unit.md. */
export function listMaster<T = ApiMasterEntry>(
  category: MasterCategory,
  q?: ListQuery,
  signal?: AbortSignal
): Promise<MasterList<T>> {
  return api.get<MasterList<T>>(`/master/${category}`, q, signal);
}

/* POST /api/master/:category — `code` opsional (server membangkitkan
   "<prefiks>-<nano>" bila kosong); balasannya entri utuh ber-`code`.
   Kode duplikat dalam kategori = 409. */
export function createMasterEntry<T = ApiMasterEntry>(
  category: MasterCategory,
  body: Record<string, unknown>
): Promise<T> {
  return api.post<T>(`/master/${category}`, body);
}

/* PUT /api/master/:category/:code — segmen terakhir path bernama ":id" di
   router backend tapi isinya CODE entri, bukan id numerik tabel. Patch
   parsial: hanya field yang dikirim yang berubah; kode tak dikenal = 404. */
export function updateMasterEntry(
  category: MasterCategory,
  code: string,
  body: Record<string, unknown>
): Promise<void> {
  return api.put<void>(`/master/${category}/${encodeURIComponent(code)}`, body);
}

/* DELETE /api/master/:category/:code — hard delete; kode tak dikenal = 404. */
export function deleteMasterEntry(
  category: MasterCategory,
  code: string
): Promise<void> {
  return api.del<void>(`/master/${category}/${encodeURIComponent(code)}`);
}

/* ── Impor Excel terpandu ────────────────────────────────────────────────

   Hanya untuk kategori di MASTER_IMPORT_CATEGORIES. Dua langkah seperti
   impor karyawan: preview dulu (tidak menulis apa pun), lalu commit yang
   mem-parse dan MEMVALIDASI ULANG berkasnya di server.

   Kategori lain tetap dilayani POST /import yang sama lewat jalur generik
   lama (bentuk balasannya {imported, category}); belum ada layar untuknya. */

/* Kategori yang punya impor terpandu — cerminan
   internal/export/master_import.go MasterImportCategories. */
export const MASTER_IMPORT_CATEGORIES = ["eqclass", "egi"] as const;

export type MasterImportCategory = (typeof MASTER_IMPORT_CATEGORIES)[number];

export function hasGuidedImport(
  cat: MasterCategory
): cat is MasterImportCategory {
  return (MASTER_IMPORT_CATEGORIES as readonly string[]).includes(cat);
}

/* Sama persis dengan ApiImportIssue di endpoints/employees.ts — dua layar
   impor merender satu bentuk tabel hasil. */
export type ApiMasterImportRow = {
  row: number;
  kind: "new" | "updated" | "unchanged";
  /* Kunci baris: Kode (Eq. Class) atau Type EGI. */
  name: string;
  /* Keterangan (Eq. Class) atau kode Eq. Class induk (Type EGI). */
  extra: string;
  data: string;
  changes: { field: string; from: string; to: string }[] | null;
};

export type ApiMasterImportPreview = {
  fileName: string;
  category: MasterImportCategory;
  categoryLabel: string;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  /* > 0 memblokir commit sepenuhnya. */
  errorCount: number;
  rows: ApiMasterImportRow[];
  errors:
    | {
        row: string;
        nik: string;
        emp: string;
        issue: string;
        badgeVariant: "danger" | "warning";
        badge: string;
      }[]
    | null;
  warnings:
    | {
        row: string;
        nik: string;
        emp: string;
        issue: string;
        badgeVariant: "danger" | "warning";
        badge: string;
      }[]
    | null;
};

export type ApiMasterImportResult = {
  created: number;
  updated: number;
  unchanged: number;
};

/* GET /api/master/:category/import/template — xlsx. Template Type EGI
   membawa sheet Referensi berisi kode Eq. Class yang berlaku SAAT INI,
   jadi dibangkitkan ulang tiap unduh. Kategori tanpa impor terpandu = 400. */
export function downloadMasterImportTemplate(
  category: MasterImportCategory
): Promise<Blob> {
  return requestBlob(`/master/${category}/import/template`);
}

/* POST /api/master/:category/import/preview — tidak menulis apa pun. */
export function previewImportMaster(
  category: MasterImportCategory,
  file: File
): Promise<ApiMasterImportPreview> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<ApiMasterImportPreview>(
    `/master/${category}/import/preview`,
    fd
  );
}

/* POST /api/master/:category/import — commit. Menolak 422 bila berkasnya
   masih punya error. */
export function importMaster(
  category: MasterImportCategory,
  file: File
): Promise<ApiMasterImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<ApiMasterImportResult>(`/master/${category}/import`, fd);
}

/* GET /api/master/:category/export */
export function exportMaster(
  category: MasterCategory,
  q?: ListQuery
): Promise<Blob> {
  return requestBlob(`/master/${category}/export`, q);
}

/* Modul Karyawan — grup `/api/employees`, permission modul `employees`.

   Identitas baris adalah NIK, bukan id numerik: seluruh route detail memakai
   `:nik`. Kolom `id` tetap ada di payload tapi tidak dipakai sebagai kunci. */

import { api, requestBlob } from "../client";
import type { ListQuery, Paged } from "../types";

/* internal/model/employee.go — Competency.
   cls = Type EGI (dipakai matcher auto-alokasi), eq = kode Eq. Class
   ("Pilih Kompetensi", migrasi 000030), simper = warisan (tak diisi form). */
export type ApiCompetency = {
  cls: string;
  eq: string;
  simper: string;
  exp: string;
};

/* internal/model/employee.go — Employee.
   Nama field-nya singkat mengikuti tipe mock di lib/data/employees.ts.

   PERHATIAN soal tanggal: `simperExp`, `join`, dan `exp` dideklarasikan
   sebagai string di Go, tapi kolomnya bertipe DATE — GORM memulangkannya
   sebagai RFC3339 penuh, mis. "2026-12-01T00:00:00Z", bukan "2026-12-01".
   Potong sendiri di UI (slice(0, 10)) atau format dengan Intl; jangan
   menampilkan nilainya mentah. Diverifikasi langsung dari respons API. */
export type ApiEmployee = {
  id: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  simper: string;
  simperExp: string;
  status: string;
  company: string;
  equip: string;
  join: string;
  exp: string;
  license: string;
  mcu: string;
  /* medis + medMonitor = Riwayat Medis: backend mengosongkannya bila akun
     tidak memegang modul RBAC `medical` (view utk lihat, manage utk tulis) */
  medis: string;
  medMonitor: string;
  blood: string;
  bpjs: string;
  mess: string;
  kamar: string;
  hp: string;
  emg: string;
  /* Path relatif ke berkas unggahan — bungkus dengan assetUrl() dari client. */
  foto?: string;
  komp?: ApiCompetency[];
  createdAt: string;
  updatedAt: string;
};

/* Payload create/update. NIK hanya ada saat membuat: mengubahnya berarti
   membuat karyawan lain, dan backend memang tidak menerimanya di update. */
export type CreateEmployeeBody = Omit<
  ApiEmployee,
  "id" | "komp" | "createdAt" | "updatedAt"
>;
export type UpdateEmployeeBody = Omit<CreateEmployeeBody, "nik">;

/* Filter `pos` TIDAK didukung backend (pkg/filter hanya mengenal search,
   status, dept, nik, rentang tanggal, dan month) — saring di klien bila
   perlu, jangan kirim sebagai query. */
export type EmployeeQuery = ListQuery;

/* GET /api/employees */
export function listEmployees(
  q?: EmployeeQuery,
  signal?: AbortSignal
): Promise<Paged<ApiEmployee>> {
  return api.get<Paged<ApiEmployee>>("/employees/", q, signal);
}

/* Seluruh karyawan, lintas halaman. perPage dipangkas backend ke 200
   (pagination.MaxPerPage), jadi halaman berikutnya diambil berurutan sampai
   meta menyatakan habis. Dipakai pemanggil yang menyaring di klien: halaman
   list Karyawan (filter dept-nya multi-pilih, tidak bisa diekspresikan query
   backend) dan dropdown "Karyawan tertaut" di menu User. */
export async function listAllEmployees(
  signal?: AbortSignal
): Promise<ApiEmployee[]> {
  const out: ApiEmployee[] = [];
  for (let page = 1; ; page++) {
    const res = await listEmployees({ page, perPage: 200 }, signal);
    out.push(...res.items);
    if (page >= res.pagination.totalPages || res.items.length === 0) break;
  }
  return out;
}

/* GET /api/employees/:nik */
export function getEmployee(nik: string): Promise<ApiEmployee> {
  return api.get<ApiEmployee>(`/employees/${encodeURIComponent(nik)}`);
}

/* POST /api/employees */
export function createEmployee(body: CreateEmployeeBody): Promise<ApiEmployee> {
  return api.post<ApiEmployee>("/employees/", body);
}

/* PUT /api/employees/:nik */
export function updateEmployee(
  nik: string,
  body: UpdateEmployeeBody
): Promise<void> {
  return api.put<void>(`/employees/${encodeURIComponent(nik)}`, body);
}

/* DELETE /api/employees/:nik */
export function deleteEmployee(nik: string): Promise<void> {
  return api.del<void>(`/employees/${encodeURIComponent(nik)}`);
}

/* GET /api/employees/:nik/competencies */
export function getCompetencies(nik: string): Promise<ApiCompetency[]> {
  return api.get<ApiCompetency[]>(
    `/employees/${encodeURIComponent(nik)}/competencies`
  );
}

/* PUT /api/employees/:nik/competencies — mengganti seluruh daftar, bukan
   menambah satu per satu. */
export function updateCompetencies(
  nik: string,
  komp: ApiCompetency[]
): Promise<void> {
  return api.put<void>(
    `/employees/${encodeURIComponent(nik)}/competencies`,
    komp
  );
}

/* POST /api/employees/:nik/photo — field form bernama `photo` (bukan `file`
   seperti unggahan lain). JPEG/PNG, maksimal 5MB; batasnya ditegakkan
   backend, jadi tangani 400 dari sini. */
export function uploadPhoto(nik: string, photo: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("photo", photo);
  return api.post<unknown>(`/employees/${encodeURIComponent(nik)}/photo`, fd);
}

/* internal/model/employee.go — PendingRegistration: baris impor Excel yang
   DITAHAN karena departemennya tidak dikenal sistem. */
export type ApiPendingRegistration = {
  id: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

/* GET /api/employees/pending */
export function listPendingRegistrations(
  signal?: AbortSignal
): Promise<ApiPendingRegistration[]> {
  return api.get<ApiPendingRegistration[]>(
    "/employees/pending",
    undefined,
    signal
  );
}

/* PUT /api/employees/pending/:id — perbaiki entri (salah ketik NIK/nama/
   departemen/posisi). Bila departemen barunya DIKENAL sistem, entri langsung
   diimpor menjadi karyawan: resolved=true, entry=null. Bila belum, entrinya
   diperbarui dan tetap pending: resolved=false, entry=baris terbaru. */
export function updatePendingRegistration(
  id: string | number,
  body: { nik: string; name: string; dept: string; pos: string }
): Promise<{ resolved: boolean; entry: ApiPendingRegistration | null }> {
  return api.put<{ resolved: boolean; entry: ApiPendingRegistration | null }>(
    `/employees/pending/${id}`,
    body
  );
}

/* DELETE /api/employees/pending/:id — hanya membersihkan daftar; data
   karyawannya TIDAK dibuat. */
export function deletePendingRegistration(id: string | number): Promise<void> {
  return api.del<void>(`/employees/pending/${id}`);
}

/* ── Impor Excel: Data Karyawan + Kompetensi Alat Berat ──────────────────

   Dua langkah, pola yang sama dengan unggah Roster: preview dulu (tidak
   menulis apa pun), lalu commit. Backend mem-parse dan MEMVALIDASI ULANG
   berkasnya saat commit — preview tidak dikirim balik dan tidak dipercaya.

   Berkasnya dua sheet: "Karyawan" (satu baris per orang, dibaca berdasarkan
   NAMA kolom sehingga urutannya bebas) dan "Kompetensi" (satu baris per
   Type EGI yang boleh dioperasikan: NIK | Eq. Class | Type EGI | Masa
   Berlaku | No. Simper). Export karyawan memakai bentuk yang sama, jadi
   hasil unduhan bisa disunting lalu diunggah kembali. */

/* internal/dto/employee_import.go — ImportIssue. Bentuknya sengaja sama
   dengan ApiRosterError agar kedua layar impor memakai satu tabel hasil. */
export type ApiImportIssue = {
  row: string;
  nik: string;
  emp: string;
  issue: string;
  badgeVariant: "danger" | "warning";
  badge: string;
};

/* Kolom yang akan tertimpa oleh baris "updated". */
export type ApiImportChange = { field: string; from: string; to: string };

export type ApiEmployeeImportRow = {
  row: number;
  /* pending = departemennya tidak dikenal → masuk Pending Registrasi,
     bukan Data Karyawan. */
  kind: "new" | "updated" | "unchanged" | "pending";
  nik: string;
  name: string;
  data: string;
  /* Kompetensi yang akan DIPASANG untuk NIK ini ("HD 785 / 777 · 2027-03-01").
     Kosong = sheet Kompetensi tidak menyebut NIK ini; SIMPER lamanya tidak
     disentuh. */
  komp: string[] | null;
  changes: ApiImportChange[] | null;
};

export type ApiEmployeeImportPreview = {
  fileName: string;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  pendingCount: number;
  /* > 0 memblokir commit sepenuhnya. */
  errorCount: number;
  kompRowCount: number;
  kompEmpCount: number;
  /* Karyawan yang kompetensinya BENAR-BENAR berubah. Ikut menentukan apakah
     ada yang perlu ditulis: berkas yang data karyawannya sudah sama persis
     dan hanya mengisi SIMPER yang masih kosong tetap punya pekerjaan. */
  kompChangedCount: number;
  /* false = berkas tanpa sheet Kompetensi; kompetensi yang tersimpan
     dibiarkan apa adanya. */
  kompSheetFound: boolean;
  rows: ApiEmployeeImportRow[];
  errors: ApiImportIssue[] | null;
  warnings: ApiImportIssue[] | null;
  newPositions: string[] | null;
};

export type ApiEmployeeImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  pending: number;
  kompUpdated: number;
  positionsCreated: number;
};

/* GET /api/employees/import/template — xlsx tiga sheet (Karyawan,
   Kompetensi, Referensi). Dibuat ulang tiap unduh: sheet Referensi berisi
   Type EGI per Eq. Class yang berlaku SAAT INI. Permission: employees:manage. */
export function downloadImportTemplate(): Promise<Blob> {
  return requestBlob("/employees/import/template");
}

/* POST /api/employees/import/preview — tidak menulis apa pun. */
export function previewImportEmployees(
  file: File
): Promise<ApiEmployeeImportPreview> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<ApiEmployeeImportPreview>("/employees/import/preview", fd);
}

/* POST /api/employees/import — commit. Menolak 422 bila berkasnya masih
   punya error, jadi tangani kegagalan di sini alih-alih menganggap sukses. */
export function importEmployees(file: File): Promise<ApiEmployeeImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<ApiEmployeeImportResult>("/employees/import", fd);
}

/* GET /api/employees/export */
export function exportEmployees(q?: EmployeeQuery): Promise<Blob> {
  return requestBlob("/employees/export", q);
}

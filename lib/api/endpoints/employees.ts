/* Modul Karyawan — grup `/api/employees`, permission modul `employees`.

   Identitas baris adalah NIK, bukan id numerik: seluruh route detail memakai
   `:nik`. Kolom `id` tetap ada di payload tapi tidak dipakai sebagai kunci. */

import { api, requestBlob } from "../client";
import type { ListQuery, Paged } from "../types";

/* internal/model/employee.go — Competency */
export type ApiCompetency = {
  cls: string;
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
  medis: string;
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

/* POST /api/employees/import — Excel, field form `file`. */
export function importEmployees(file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>("/employees/import", fd);
}

/* GET /api/employees/export */
export function exportEmployees(q?: EmployeeQuery): Promise<Blob> {
  return requestBlob("/employees/export", q);
}

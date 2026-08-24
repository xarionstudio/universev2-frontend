/* Modul Master Data — grup `/api/master/:category`, permission modul `master`.

   Satu set route melayani sembilan kategori sekaligus; yang membedakan hanya
   segmen `:category`. Bentuk barisnya karena itu BERBEDA per kategori (lihat
   internal/model/master.go), jadi fungsi di sini digenerikkan dan pemanggil
   yang menyebutkan tipe barisnya. */

import { api, requestBlob } from "../client";
import type { ListQuery, Paged } from "../types";

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

/* GET /api/master/:category */
export function listMaster<T = ApiMasterEntry>(
  category: MasterCategory,
  q?: ListQuery,
  signal?: AbortSignal
): Promise<Paged<T>> {
  return api.get<Paged<T>>(`/master/${category}`, q, signal);
}

/* POST /api/master/:category */
export function createMasterEntry<T = ApiMasterEntry>(
  category: MasterCategory,
  body: Record<string, unknown>
): Promise<T> {
  return api.post<T>(`/master/${category}`, body);
}

/* PUT /api/master/:category/:id */
export function updateMasterEntry(
  category: MasterCategory,
  id: string | number,
  body: Record<string, unknown>
): Promise<void> {
  return api.put<void>(`/master/${category}/${id}`, body);
}

/* DELETE /api/master/:category/:id */
export function deleteMasterEntry(
  category: MasterCategory,
  id: string | number
): Promise<void> {
  return api.del<void>(`/master/${category}/${id}`);
}

/* POST /api/master/:category/import — field form `file`. */
export function importMaster(
  category: MasterCategory,
  file: File
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<unknown>(`/master/${category}/import`, fd);
}

/* GET /api/master/:category/export */
export function exportMaster(
  category: MasterCategory,
  q?: ListQuery
): Promise<Blob> {
  return requestBlob(`/master/${category}/export`, q);
}

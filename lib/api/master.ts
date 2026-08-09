/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/master.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { MasterEntry, MdCat } from "./types";

export const masterApi = {
  /** Fetch master data by category */
  async getByCategory(category: MdCat): Promise<MasterEntry[]> {
    return apiFetch<MasterEntry[]>(`/master/${category}`, {
      method: "GET",
    });
  },

  /** Create entry in master category */
  async create(
    category: MdCat,
    data: Record<string, unknown>
  ): Promise<MasterEntry> {
    return apiFetch<MasterEntry>(`/master/${category}`, {
      method: "POST",
      body: data,
    });
  },

  /** Update master entry */
  async update(
    category: MdCat,
    id: number,
    data: Record<string, unknown>
  ): Promise<MasterEntry> {
    return apiFetch<MasterEntry>(`/master/${category}/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete master entry */
  async delete(category: MdCat, id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/master/${category}/${id}`, {
      method: "DELETE",
    });
  },

  /** Import master data file */
  async import(
    category: MdCat,
    formData: FormData
  ): Promise<{ imported: number }> {
    return apiFetch<{ imported: number }>(`/master/${category}/import`, {
      method: "POST",
      body: formData,
    });
  },
};

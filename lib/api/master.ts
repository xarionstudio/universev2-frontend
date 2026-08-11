/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/master.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { downloadBlob } from "@/lib/utils";

import { apiFetch } from "./client";
import type { MasterEntry, MdCat } from "./types";

export const masterApi = {
  /** Fetch master data by category */
  async getByCategory(category: MdCat): Promise<MasterEntry[]> {
    const response = await apiFetch<{
      entries: MasterEntry[];
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    }>(`/master/${category}`, {
      method: "GET",
    });
    return response.entries || [];
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

  /** Update master entry by code */
  async update(
    category: MdCat,
    code: string,
    data: Record<string, unknown>
  ): Promise<MasterEntry> {
    return apiFetch<MasterEntry>(`/master/${category}/${code}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete master entry by code */
  async delete(category: MdCat, code: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/master/${category}/${code}`, {
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

  /** Download master data as xlsx */
  async export(category: MdCat): Promise<void> {
    const url =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api") +
      `/master/${category}/export`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    const name = m?.[1] || `${category}_export.xlsx`;
    downloadBlob(blob, name);
  },
};

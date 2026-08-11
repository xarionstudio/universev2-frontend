/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/users.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { downloadBlob } from "@/lib/utils";

import { apiFetch } from "./client";
import type { ApiUser } from "./types";

export const usersApi = {
  /** Fetch list of system users */
  async getUsers(): Promise<ApiUser[]> {
    return apiFetch<ApiUser[]>("/users", {
      method: "GET",
    });
  },

  /** Create new user */
  async create(data: {
    email: string;
    kar: string;
    nik?: string;
    roles?: string[];
    password?: string;
  }): Promise<ApiUser> {
    return apiFetch<ApiUser>("/users", {
      method: "POST",
      body: data,
    });
  },

  /** Update user details */
  async update(
    id: number,
    data: Partial<ApiUser> & { name?: string; password?: string }
  ): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/users/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Toggle user active status */
  async toggleStatus(id: number, on: boolean): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/users/${id}/status`, {
      method: "PATCH",
      body: { on },
    });
  },

  /** Delete user */
  async delete(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/users/${id}`, {
      method: "DELETE",
    });
  },

  /** Import users file */
  async import(formData: FormData): Promise<{ imported: number }> {
    return apiFetch<{ imported: number }>("/users/import", {
      method: "POST",
      body: formData,
    });
  },

  /** Download users as CSV */
  async export(): Promise<void> {
    const url =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api") +
      "/users/export";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    const name = m?.[1] || "users_export.csv";
    downloadBlob(blob, name);
  },
};

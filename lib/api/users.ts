/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/users.ts
 * ────────────────────────────────────────────────────────────────────────── */

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
};

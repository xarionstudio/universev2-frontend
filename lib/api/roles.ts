/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/roles.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { ApiRole } from "./types";

export const rolesApi = {
  /** Fetch list of RBAC roles */
  async getRoles(): Promise<ApiRole[]> {
    return apiFetch<ApiRole[]>("/roles", {
      method: "GET",
    });
  },

  /** Create new role */
  async create(data: {
    name: string;
    desc?: string;
    perms: Record<string, string>;
  }): Promise<ApiRole> {
    return apiFetch<ApiRole>("/roles", {
      method: "POST",
      body: data,
    });
  },

  /** Update role permissions/info */
  async update(
    id: number,
    data: { name?: string; desc?: string; perms?: Record<string, string> }
  ): Promise<ApiRole> {
    return apiFetch<ApiRole>(`/roles/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete role */
  async delete(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/roles/${id}`, {
      method: "DELETE",
    });
  },
};

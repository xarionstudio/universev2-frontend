/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/prestasi.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { PrestasiDay, PrestasiRecord } from "./types";

export const prestasiApi = {
  /** Get leaderboard records */
  async getLeaderboard(params?: {
    days?: number;
    dept?: string;
  }): Promise<PrestasiRecord[]> {
    return apiFetch<PrestasiRecord[]>("/prestasi/leaderboard", {
      method: "GET",
      params,
    });
  },

  /** Get operator's daily achievement audit history */
  async getOperatorHistory(nik: string, days?: number): Promise<PrestasiDay[]> {
    return apiFetch<PrestasiDay[]>(`/prestasi/${nik}/history`, {
      method: "GET",
      params: { days },
    });
  },

  /** Recalculate prestasi points for all operators */
  async recalculate(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/prestasi/recalculate", {
      method: "POST",
    });
  },
};

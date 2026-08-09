/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/dashboard.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { DashboardSummary } from "./types";

export const dashboardApi = {
  /** Fetch aggregated dashboard summary statistics */
  async getSummary(date?: string): Promise<DashboardSummary> {
    return apiFetch<DashboardSummary>("/dashboard/summary", {
      method: "GET",
      params: { date },
    });
  },
};

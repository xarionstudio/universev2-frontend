/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/ftw.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { FTWHistEntry, FTWRecord } from "./types";

export type SubmitFTWPayload = {
  nik: string;
  shift: string;
  sleepMin: number;
  sleep: string;
  hist?: number[];
  sendTime?: string;
  date?: string;
};

export const ftwApi = {
  /** Fetch today's fit-to-work logs */
  async getTodayLogs(date?: string): Promise<FTWRecord[]> {
    return apiFetch<FTWRecord[]>("/ftw/today", {
      method: "GET",
      params: { date },
    });
  },

  /** Fetch history for specific employee or date range */
  async getHistory(params?: {
    nik?: string;
    from?: string;
    to?: string;
  }): Promise<FTWHistEntry[]> {
    return apiFetch<FTWHistEntry[]>("/ftw/history", {
      method: "GET",
      params,
    });
  },

  /** Submit a fit-to-work log */
  async submitLog(payload: SubmitFTWPayload): Promise<FTWRecord> {
    return apiFetch<FTWRecord>("/ftw/submit", {
      method: "POST",
      body: payload,
    });
  },
};

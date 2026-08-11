/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/ftw.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { downloadBlob } from "@/lib/utils";

import { apiFetch, apiFetchAllItems } from "./client";
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
    return apiFetchAllItems<FTWRecord>("/ftw/today", {
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
      params: {
        nik: params?.nik,
        from: params?.from,
        to: params?.to,
        date_from: params?.from,
        date_to: params?.to,
      },
    });
  },

  /** Submit a fit-to-work log */
  async submitLog(payload: SubmitFTWPayload): Promise<FTWRecord> {
    return apiFetch<FTWRecord>("/ftw/submit", {
      method: "POST",
      body: payload,
    });
  },

  /** Download FTW export file from backend (binary xlsx). */
  async exportFtw(params?: {
    date?: string;
    shift?: string;
    status?: string;
    q?: string;
  }): Promise<void> {
    const url = new URL(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api") +
        "/ftw/export"
    );
    if (params?.date) url.searchParams.set("date", params.date);
    if (params?.shift) url.searchParams.set("shift", params.shift);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.q) url.searchParams.set("q", params.q);
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    const name = m?.[1] || "ftw_export.xlsx";
    downloadBlob(blob, name);
  },

  /** Evaluate FTW status based on sleep minutes (single source of truth from backend) */
  async evaluateFTW(sleepMin: number | null): Promise<{
    status: "fit" | "spare" | "pulang" | "belum";
    restHours: number;
    canWork: boolean;
  }> {
    return apiFetch<{
      status: "fit" | "spare" | "pulang" | "belum";
      restHours: number;
      canWork: boolean;
    }>("/ftw/evaluate", {
      method: "POST",
      body: { sleepMin },
    });
  },
};

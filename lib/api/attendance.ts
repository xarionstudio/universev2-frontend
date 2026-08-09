/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/attendance.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { AttendanceRow } from "./types";

export const attendanceApi = {
  /** Fetch today's attendance logs */
  async getToday(): Promise<AttendanceRow[]> {
    return apiFetch<AttendanceRow[]>("/attendance/today", {
      method: "GET",
    });
  },

  /** Fetch attendance by date */
  async getByDate(date: string): Promise<AttendanceRow[]> {
    return apiFetch<AttendanceRow[]>("/attendance/date", {
      method: "GET",
      params: { date },
    });
  },

  /** Fetch attendance by date range */
  async getRange(from: string, to: string): Promise<AttendanceRow[]> {
    return apiFetch<AttendanceRow[]>("/attendance/range", {
      method: "GET",
      params: { from, to },
    });
  },

  /** Record manual check-in */
  async recordCheckIn(nik: string, time?: string): Promise<AttendanceRow> {
    return apiFetch<AttendanceRow>("/attendance/checkin", {
      method: "POST",
      body: { nik, time },
    });
  },

  /** Record manual check-out */
  async recordCheckOut(nik: string, time?: string): Promise<AttendanceRow> {
    return apiFetch<AttendanceRow>("/attendance/checkout", {
      method: "POST",
      body: { nik, time },
    });
  },
};

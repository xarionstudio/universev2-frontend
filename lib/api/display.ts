/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/display.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { AttendanceRow, FTWRecord, Unit } from "./types";

export const displayApi = {
  /** Fetch display attendance TV data */
  async getDisplayAttendance(): Promise<AttendanceRow[]> {
    return apiFetch<AttendanceRow[]>("/display/attendance", {
      method: "GET",
    });
  },

  /** Fetch display FTW TV data */
  async getDisplayFTW(): Promise<FTWRecord[]> {
    return apiFetch<FTWRecord[]>("/display/ftw", {
      method: "GET",
    });
  },

  /** Fetch display fleet TV data */
  async getDisplayFleet(): Promise<Unit[]> {
    return apiFetch<Unit[]>("/display/fleet", {
      method: "GET",
    });
  },

  /** Fetch display monitor overview data */
  async getDisplayMonitor(): Promise<unknown> {
    return apiFetch<unknown>("/display/monitor", {
      method: "GET",
    });
  },

  /** Fetch display fingerprint device status */
  async getDisplayFingerprint(): Promise<unknown> {
    return apiFetch<unknown>("/display/fingerprint", {
      method: "GET",
    });
  },

  /** Send display kiosk heartbeat */
  async sendHeartbeat(code: string): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/displays/${code}/heartbeat`, {
      method: "GET",
    });
  },
};

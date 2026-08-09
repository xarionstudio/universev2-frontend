/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/roster.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type {
  AttendanceRow,
  RosterExportRow,
  RosterMeta,
  RosterRevision,
} from "./types";

export const rosterApi = {
  /** Fetch list of roster files */
  async getRosters(): Promise<RosterMeta[]> {
    return apiFetch<RosterMeta[]>("/rosters", {
      method: "GET",
    });
  },

  /** Fetch roster file detail and export rows */
  async getRosterDetail(key: number): Promise<{
    meta: RosterMeta;
    rows: RosterExportRow[];
  }> {
    return apiFetch<{
      meta: RosterMeta;
      rows: RosterExportRow[];
    }>(`/rosters/${key}/detail`, {
      method: "GET",
    });
  },

  /** Upload roster Excel/CSV file */
  async uploadRoster(formData: FormData): Promise<RosterMeta> {
    return apiFetch<RosterMeta>("/rosters/upload", {
      method: "POST",
      body: formData,
    });
  },

  /** Fetch pending/history roster revisions */
  async getRevisions(status?: string): Promise<RosterRevision[]> {
    return apiFetch<RosterRevision[]>("/rosters/revisions", {
      method: "GET",
      params: { status },
    });
  },

  /** Submit batch revision request */
  async submitBatchRevision(revisions: Partial<RosterRevision>[]): Promise<{
    message: string;
    sid: string;
  }> {
    return apiFetch<{ message: string; sid: string }>(
      "/rosters/revisions/batch",
      {
        method: "POST",
        body: { revisions },
      }
    );
  },

  /** Approve revision request */
  async approveRevision(id: number): Promise<RosterRevision> {
    return apiFetch<RosterRevision>(`/rosters/approvals/${id}/approve`, {
      method: "PUT",
    });
  },

  /** Approve revision with note */
  async approveRevisionWithNote(
    id: number,
    note: string
  ): Promise<RosterRevision> {
    return apiFetch<RosterRevision>(`/rosters/approvals/${id}/note`, {
      method: "PATCH",
      body: { note },
    });
  },

  /** Reject revision request */
  async rejectRevision(id: number, reason?: string): Promise<RosterRevision> {
    return apiFetch<RosterRevision>(`/rosters/approvals/${id}/reject`, {
      method: "PUT",
      body: { reason },
    });
  },

  /** Delete revision request */
  async deleteRevision(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/rosters/revisions/${id}`, {
      method: "DELETE",
    });
  },

  /** Get roster-based attendance logs */
  async getAttendance(date?: string): Promise<AttendanceRow[]> {
    return apiFetch<AttendanceRow[]>("/rosters/attendance", {
      method: "GET",
      params: { date },
    });
  },
};

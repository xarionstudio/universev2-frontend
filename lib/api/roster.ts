/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/roster.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { downloadBlob } from "@/lib/utils";

import { apiFetch, apiFetchAllItems, apiUploadWithProgress } from "./client";
import type {
  AttendanceRow,
  RosterExportRow,
  RosterMeta,
  RosterRevision,
  RosterValidation,
  ShiftCodeGroup,
} from "./types";

export type RevisionCode = {
  id: string;
  label: string;
};

export const rosterApi = {
  /** Fetch list of roster files */
  async getRosters(): Promise<RosterMeta[]> {
    return apiFetchAllItems<RosterMeta>("/rosters", {
      method: "GET",
    });
  },

  /** Fetch revision codes */
  async getRevisionCodes(): Promise<RevisionCode[]> {
    return apiFetch<RevisionCode[]>("/rosters/revisions/codes", {
      method: "GET",
    });
  },

  /** Fetch grouped shift codes for legend */
  async getShiftCodes(): Promise<ShiftCodeGroup[]> {
    return apiFetch<ShiftCodeGroup[]>("/rosters/codes", {
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

  /** Upload roster Excel/CSV file with XHR progress tracking & validation result */
  async uploadRosterWithProgress(
    formData: FormData,
    onProgress: (pct: number) => void
  ): Promise<{ meta: RosterMeta; validation: RosterValidation }> {
    return apiUploadWithProgress<{
      meta: RosterMeta;
      validation: RosterValidation;
    }>("/rosters/upload", formData, onProgress);
  },

  /** Fetch pending/history roster revisions */
  async getRevisions(status?: string): Promise<RosterRevision[]> {
    return apiFetchAllItems<RosterRevision>("/rosters/revisions", {
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

  /** Download roster export file from backend (binary xlsx). */
  async exportRoster(key: string | number): Promise<void> {
    const url =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api") +
      `/rosters/${key}/export`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Export failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(contentDisposition);
    const filename = match?.[1] || `roster_${key}_export.xlsx`;
    downloadBlob(blob, filename);
  },
};

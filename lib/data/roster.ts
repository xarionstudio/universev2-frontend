import type { Lang } from "@/lib/i18n";

/* ===== Data roster (list per bulan, satu file per departemen) =====
   Diambil dari backend API GET /api/rosters. */
export type RosterMeta = {
  key: string;
  label: string;
  month: string;
  dept: string;
  file: string;
  emp: string;
  rows: string;
  by: string;
  date: string;
  dateISO: string;
  status: "aktif" | "arsip";
};

/* ===== Legend kode roster ===== */
export type LegendGroup = { label: string; codes: { k: string; v: string }[] };

/* ===== Baris error hasil validasi upload ===== */
export type UpError = {
  row: string;
  nik: string;
  emp: string;
  issue: string;
  badgeVariant: "danger" | "warning";
  badge: string;
};

/* ===== Preview file roster (matriks per tanggal) ===== */
export type UpPreview = {
  days: string[];
  rows: { nik: string; name: string; codes: { v: string; color: string }[] }[];
};

/* ===== 3 · approval ===== */
export type ApRow = {
  id?: number;
  sid: string;
  name: string;
  nik: string;
  whatId: string;
  whatEn: string;
  whenId: string;
  whenEn: string;
  status: "pending" | "approved" | "rejected";
  byId?: string;
  byEn?: string;
};

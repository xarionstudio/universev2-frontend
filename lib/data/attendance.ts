import type { Lang } from "@/lib/i18n";

/* ===== 4 · attendance =====
   Diambil dari backend API GET /api/attendance/today, /date, /range. */
export type AttStatus = "hadir" | "terlambat" | "belum" | "unfit" | "off";

export type AttRow = {
  name: string;
  nik: string;
  dept: string;
  code: string;
  in: string;
  inM: string;
  out: string;
  outM: string;
  st: AttStatus;
  date?: string;
  dLabel?: string;
};

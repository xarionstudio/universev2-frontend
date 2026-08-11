import type { FtwStatus } from "@/lib/data/ftw";
/* ---------- Dynamic business rules (from backend) ---------- */

import { usePrestasiPoints } from "@/components/providers/business-rules";

/* Prestasi — utilitas poin & format untuk halaman leaderboard.

   Mesin poin sesungguhnya dijalankan di backend (POST /api/prestasi/recalculate).
   File ini hanya berisi konstanta & helper format yang dipakai frontend. */

/* ---------- Konstanta poin (fallback values) ---------- */

/* Basis: satu operasi yang memenuhi syarat */
export const PTS_BASE = 10;
/* Bonus hadir tepat waktu (bukan terlambat) */
export const PTS_ONTIME = 2;
/* Bonus tidur berkualitas (>= 7 jam) */
export const PTS_SLEEP = 3;
/* Bonus konsistensi: per hari beruntun setelah hari pertama, dibatasi */
export const PTS_STREAK_STEP = 2;
export const PTS_STREAK_CAP = 10;
/* Bonus menggantikan operator lain di hari yang seharusnya libur */
export const PTS_COVER = 5;
/* Potongan saat dijadwalkan D/N tapi harus digantikan. */
export const PTS_PENALTY = -15;

/* Ambang "tidur berkualitas" untuk bonus */
export const SLEEP_MIN_GREAT = 420; // 7 jam

export type PrestasiPeriod = "week" | "month" | "all";

export const PERIOD_DAYS: Record<PrestasiPeriod, number> = {
  week: 7,
  month: 30,
  all: 90,
};

/**
 * Hook untuk mendapatkan poin prestasi dinamis dari backend.
 * Fallback ke hardcoded values jika backend error.
 *
 * @example
 * const { ptsBase, ptsOntime, ptsSleep } = usePrestasiPoints();
 */
export { usePrestasiPoints } from "@/components/providers/business-rules";

/* ---------- Utilitas tanggal ---------- */

export function isoAdd(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Kode roster ---------- */

/* Kode roster mengikuti kamus yang sudah dipakai modul Roster.
   Hanya D & N yang berarti "dijadwalkan mengoperasikan unit". */
export type RosterCode = "D" | "N" | "OFF" | "CR" | "R" | "STB";

export const OPERATING_CODES: RosterCode[] = ["D", "N"];

export function isOperatingCode(code: RosterCode): boolean {
  return code === "D" || code === "N";
}

/* ---------- Tipe hasil harian ---------- */

export type DayOutcome =
  | "notScheduled"
  | "qualified"
  | "replacedAbsent"
  | "replacedSleep"
  | "replacement";

export type AttMark = "hadir" | "terlambat" | "belum" | "off";

export type PrestasiDay = {
  iso: string;
  code: RosterCode;
  unitCode: string | null;
  att: AttMark;
  clockIn: string;
  late: boolean;
  sleepMin: number;
  attOk: boolean;
  sleepOk: boolean;
  ftwStatus: FtwStatus;
  restHours: number;
  outcome: DayOutcome;
  counterpartNik: string | null;
  counterpartName: string | null;
  points: number;
};

export type PrestasiBadgeKey =
  "streak7" | "streak14" | "perfectSleep" | "neverLate" | "noPenalty";

export type PrestasiEntry = {
  rank: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  foto?: string;
  points: number;
  qualifiedDays: number;
  scheduledDays: number;
  penaltyDays: number;
  coverDays: number;
  bestStreak: number;
  currentStreak: number;
  attRate: number;
  sleepRate: number;
  avgSleepMin: number;
  badges: PrestasiBadgeKey[];
  days: PrestasiDay[];
};

/* "7 j 20 m" / "7 h 20 m" — mengikuti gaya ftw.ts */
export function fmtSleep(min: number, en: boolean): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return en ? `${h} h ${m} m` : `${h} j ${m} m`;
}

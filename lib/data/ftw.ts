import { ftwApi } from "@/lib/api/ftw";
import type { Lang } from "@/lib/i18n";
// 4 jam 00 menit

/* ---------- Dynamic business rules (from backend) ---------- */

import { useFtwThresholds } from "@/components/providers/business-rules";

/* Fit to work (log tidur).

   ATURAN KELAYAKAN BERBASIS JAM TIDUR — satu-satunya sumber kebenaran.
   Modul Prestasi ikut memakai `ftwEvaluate()` ini supaya papan peringkat dan
   halaman Fit To Work tidak pernah berbeda pendapat soal siapa yang layak.

     >= 5j30       → fit         : boleh langsung bekerja
     5j00 – 5j29   → spare       : istirahat 1 jam dulu, lalu boleh bekerja
     4j00 – 4j59   → spare       : istirahat 2 jam dulu, lalu boleh bekerja
     <  4j00       → dipulangkan : tidak boleh bekerja pada shift itu
     tidak ada log → belum       : belum mengirim log tidur
*/

export type FtwStatus = "fit" | "spare" | "pulang" | "belum";

/* Ambang dalam MENIT — dipakai lintas modul, jangan di-hardcode di tempat lain */
/* Fallback values — gunakan useFtwThresholds() untuk dynamic values dari backend */
export const SLEEP_FIT_MIN = 330; // 5 jam 30 menit
export const SLEEP_SPARE_1H_MIN = 300; // 5 jam 00 menit
export const SLEEP_SPARE_2H_MIN = 240;

/**
 * Hook untuk mendapatkan FTW thresholds dinamis dari backend.
 * Fallback ke hardcoded values jika backend error.
 *
 * @example
 * const { sleepFitMin, sleepSpare1hMin, sleepSpare2hMin } = useFtwThresholds();
 */
export { useFtwThresholds } from "@/components/providers/business-rules";

export type FtwEval = {
  status: FtwStatus;
  /* jam istirahat tambahan sebelum boleh bekerja (0, 1, atau 2) */
  restHours: number;
  /* boleh mengoperasikan unit hari itu — spare tetap boleh SETELAH istirahat */
  canWork: boolean;
};

export async function ftwEvaluate(
  sleepMin: number | null | undefined
): Promise<FtwEval> {
  // Use backend as single source of truth
  try {
    const result = await ftwApi.evaluateFTW(sleepMin ?? null);
    return {
      status: result.status,
      restHours: result.restHours,
      canWork: result.canWork,
    };
  } catch (error) {
    // Fallback to local evaluation if backend is unavailable
    console.warn("Backend FTW evaluation failed, using fallback:", error);
    if (sleepMin == null || sleepMin <= 0)
      return { status: "belum", restHours: 0, canWork: false };
    if (sleepMin >= SLEEP_FIT_MIN)
      return { status: "fit", restHours: 0, canWork: true };
    if (sleepMin >= SLEEP_SPARE_1H_MIN)
      return { status: "spare", restHours: 1, canWork: true };
    if (sleepMin >= SLEEP_SPARE_2H_MIN)
      return { status: "spare", restHours: 2, canWork: true };
    return { status: "pulang", restHours: 0, canWork: false };
  }
}

/* "7 j 20 m" / "7 h 20 m" — format tampilan dari menit */
export function fmtSleepMin(min: number | null | undefined, en: boolean) {
  if (min == null || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}${en ? " h " : " j "}${m < 10 ? "0" : ""}${m} m`;
}

/* hist: 1=fit 0=kurang -1=tanpa data (dipakai strip 7 hari) */
export type FtwRecord = {
  name: string;
  nik: string;
  dept: string;
  shift: "siang" | "malam";
  /* menit tidur — sumber angka; `sleep` hanya turunan tampilannya */
  sleepMin: number | null;
  sleep: string;
  st: FtwStatus;
  restHours: number;
  hist: number[];
};

export type FtwHistEntry = {
  d: number;
  iso: string;
  date: string;
  st: number;
  /* menit tidur hari itu — dasar penilaian tier */
  sleepMin: number | null;
  sleep: string;
  /* status & istirahat hasil ftwEvaluate(sleepMin) */
  status: FtwStatus;
  restHours: number;
  sendTime: string;
};

/* Map status FTW ke nilai strip: 1=ok, 0=bad, -1=na */
export function ftwStatusToSt(status: FtwStatus | string): number {
  if (status === "fit") return 1;
  if (status === "spare" || status === "pulang") return 0;
  return -1;
}

/** Normalisasi log FTW dari API ke entri riwayat (d = offset hari dari anchor). */
export function normalizeFtwHistFromApi(
  records: Record<string, unknown>[],
  anchorIso: string
): (FtwHistEntry & { nik: string })[] {
  const anchor = new Date(`${anchorIso}T00:00:00`);
  return records.map((h) => {
    const iso = String(h.iso || h.date || h.log_date || "");
    const logDate = iso ? new Date(`${iso}T00:00:00`) : anchor;
    const d = iso
      ? Math.round((anchor.getTime() - logDate.getTime()) / 86400000)
      : 0;
    const status = String(h.status || h.st || "belum") as FtwStatus;
    return {
      nik: String(h.nik || h.employee_nik || ""),
      d,
      iso,
      date: String(h.dateLabel || h.date || iso),
      st: ftwStatusToSt(status),
      sleepMin: h.sleepMin != null ? Number(h.sleepMin) : null,
      sleep: String(h.sleep || h.sleep_formatted || "—"),
      status,
      restHours: Number(h.restHours ?? h.rest_hours ?? 0),
      sendTime: String(h.sendTime || h.send_time || "—"),
    };
  });
}

/** Strip 7 hari dari entri riwayat API (bukan dummy hist[]). */
export function ftwStripFromEntries(
  entries: FtwHistEntry[],
  anchorD: number
): ("ok" | "bad" | "na")[] {
  const out: ("ok" | "bad" | "na")[] = [];
  for (let k = 6; k >= 0; k--) {
    const targetD = anchorD + k;
    const entry = entries.find((e) => e.d === targetD);
    if (!entry) {
      out.push("na");
      continue;
    }
    out.push(entry.st === 1 ? "ok" : entry.st === 0 ? "bad" : "na");
  }
  return out;
}

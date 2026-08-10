import type { Lang } from "@/lib/i18n";

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
export const SLEEP_FIT_MIN = 330; // 5 jam 30 menit
export const SLEEP_SPARE_1H_MIN = 300; // 5 jam 00 menit
export const SLEEP_SPARE_2H_MIN = 240; // 4 jam 00 menit

export type FtwEval = {
  status: FtwStatus;
  /* jam istirahat tambahan sebelum boleh bekerja (0, 1, atau 2) */
  restHours: number;
  /* boleh mengoperasikan unit hari itu — spare tetap boleh SETELAH istirahat */
  canWork: boolean;
};

export function ftwEvaluate(sleepMin: number | null | undefined): FtwEval {
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

/* Seed: menit tidur ditulis apa adanya, status DITURUNKAN dari aturan di atas
   sehingga data contoh tidak mungkin bertentangan dengan aturannya. */
const SEED: Array<{
  name: string;
  nik: string;
  dept: string;
  shift: "siang" | "malam";
  sleepMin: number | null;
  hist: number[];
}> = [
  {
    name: "First Angel Paustine",
    nik: "503264133",
    dept: "Operation",
    shift: "siang",
    sleepMin: 440,
    hist: [1, 1, 1, 1, 0, 1, 1],
  },
  {
    name: "Rahmat Hidayat",
    nik: "503264134",
    dept: "SDI",
    shift: "siang",
    sleepMin: 405,
    hist: [1, 1, 1, 1, 1, 1, 1],
  },
  // < 4 jam → dipulangkan
  {
    name: "Budi Santoso",
    nik: "503264135",
    dept: "HRGA",
    shift: "siang",
    sleepMin: 220,
    hist: [1, 0, 1, 0, 0, 1, 0],
  },
  {
    name: "Siti Nurhaliza",
    nik: "503264136",
    dept: "Operation",
    shift: "siang",
    sleepMin: 425,
    hist: [1, 1, 1, 1, 1, 0, 1],
  },
  // 5j15 → spare, istirahat 1 jam
  {
    name: "Andi Prasetyo",
    nik: "503264137",
    dept: "Plant",
    shift: "siang",
    sleepMin: 315,
    hist: [1, 1, 0, 1, 1, 1, 0],
  },
  {
    name: "Dewi Lestari",
    nik: "503264138",
    dept: "SDI",
    shift: "siang",
    sleepMin: 490,
    hist: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    name: "Joko Widodo S.",
    nik: "503264139",
    dept: "Operation",
    shift: "siang",
    sleepMin: null,
    hist: [1, 1, 1, 0, 1, -1, -1],
  },
  // 4j30 → spare, istirahat 2 jam
  {
    name: "Agus Salim",
    nik: "503264141",
    dept: "Plant",
    shift: "malam",
    sleepMin: 270,
    hist: [0, 1, 0, 1, 0, 0, 0],
  },
  {
    name: "Maya Sari",
    nik: "503264142",
    dept: "Operation",
    shift: "malam",
    sleepMin: 375,
    hist: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    name: "Hendra Gunawan",
    nik: "503264143",
    dept: "Plant",
    shift: "malam",
    sleepMin: null,
    hist: [1, 1, 1, 1, -1, 1, -1],
  },
];

/** @deprecated Use backend API GET /api/ftw/today instead. */
export function ftwData(lang: Lang): FtwRecord[] {
  const en = lang === "en";
  return SEED.map((s) => {
    const ev = ftwEvaluate(s.sleepMin);
    return {
      ...s,
      sleep: fmtSleepMin(s.sleepMin, en),
      st: ev.status,
      restHours: ev.restHours,
    };
  });
}

/* status hari ke-d (0=hari ini) — 7 hari pertama dari hist, sisanya deterministik */
/** @deprecated Dummy helper for static history strip. */
export function ftwStAt(rec: FtwRecord, d: number): number {
  if (d < 7) return rec.hist[6 - d];
  return [1, 1, 0, 1, 1, 1, 1][(d + rec.nik.charCodeAt(8)) % 7];
}

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

/* riwayat N hari per operator (default 90) + waktu kirim log */
/** @deprecated Use backend API GET /api/ftw/history instead. */
export function ftwHistoryFor(
  rec: FtwRecord,
  lang: Lang,
  days = 90
): FtwHistEntry[] {
  const MON =
    lang === "en"
      ? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ]
      : [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "Mei",
          "Jun",
          "Jul",
          "Agu",
          "Sep",
          "Okt",
          "Nov",
          "Des",
        ];
  const en = lang === "en";
  const out: FtwHistEntry[] = [];
  for (let d = 0; d < days; d++) {
    const st = ftwStAt(rec, d);
    const dt = new Date(Date.now() - d * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const dateLbl = `${dt.getDate() < 10 ? "0" : ""}${dt.getDate()} ${MON[dt.getMonth()]} ${dt.getFullYear()}`;
    /* Menit tidur dulu, status menyusul dari aturan — bukan sebaliknya.
       Hari "kurang" sengaja disebar 3j20–5j20 supaya ketiga tier di bawah
       ambang (dipulangkan, spare 2 jam, spare 1 jam) semuanya terwakili. */
    let sleepMin: number | null;
    if (st === 1) {
      sleepMin = 360 + ((d * 37) % 120); // 6j00–7j59 → fit
    } else if (st === 0) {
      sleepMin = 200 + ((d * 23) % 120); // 3j20–5j19 → pulang / spare
    } else {
      sleepMin = null; // belum kirim log
    }
    const ev = ftwEvaluate(sleepMin);
    let send = "—";
    if (st !== -1) {
      const hh = rec.shift === "malam" ? 16 + (d % 3) : 3 + (d % 3);
      const mm = (d * 17 + rec.nik.charCodeAt(8)) % 60;
      send = `${hh < 10 ? "0" : ""}${hh}:${mm < 10 ? "0" : ""}${mm} WITA`;
    }
    out.push({
      d,
      iso,
      date: dateLbl,
      st,
      sleepMin,
      sleep: fmtSleepMin(sleepMin, en),
      status: ev.status,
      restHours: ev.restHours,
      sendTime: send,
    });
  }
  return out;
}

/* strip 7 hari berakhir di hari ke-d */
/** @deprecated Dummy helper for static history strip. */
export function ftwStripAt(rec: FtwRecord, d: number): ("ok" | "bad" | "na")[] {
  const out: ("ok" | "bad" | "na")[] = [];
  for (let k = 6; k >= 0; k--) {
    const x = ftwStAt(rec, d + k);
    out.push(x === 1 ? "ok" : x === 0 ? "bad" : "na");
  }
  return out;
}

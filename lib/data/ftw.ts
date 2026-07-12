import type { Lang } from "@/lib/i18n";

/* Fit to work (log tidur) — hist: 1=fit 0=kurang -1=tanpa data */
export type FtwRecord = {
  name: string;
  nik: string;
  dept: string;
  shift: "siang" | "malam";
  sleep: string;
  st: "fit" | "kurang" | "belum";
  hist: number[];
};

export function ftwData(lang: Lang): FtwRecord[] {
  const en = lang === "en";
  const j = (h: number, m: number | string) =>
    en ? `${h} h ${m} m` : `${h} j ${m} m`;
  return [
    {
      name: "First Angel Paustine",
      nik: "503264133",
      dept: "Operation",
      shift: "siang",
      sleep: j(7, 20),
      st: "fit",
      hist: [1, 1, 1, 1, 0, 1, 1],
    },
    {
      name: "Rahmat Hidayat",
      nik: "503264134",
      dept: "SDI",
      shift: "siang",
      sleep: j(6, 45),
      st: "fit",
      hist: [1, 1, 1, 1, 1, 1, 1],
    },
    {
      name: "Budi Santoso",
      nik: "503264135",
      dept: "HRGA",
      shift: "siang",
      sleep: j(3, 40),
      st: "kurang",
      hist: [1, 0, 1, 0, 0, 1, 0],
    },
    {
      name: "Siti Nurhaliza",
      nik: "503264136",
      dept: "Operation",
      shift: "siang",
      sleep: j(7, "05"),
      st: "fit",
      hist: [1, 1, 1, 1, 1, 0, 1],
    },
    {
      name: "Andi Prasetyo",
      nik: "503264137",
      dept: "Plant",
      shift: "siang",
      sleep: j(5, 30),
      st: "kurang",
      hist: [1, 1, 0, 1, 1, 1, 0],
    },
    {
      name: "Dewi Lestari",
      nik: "503264138",
      dept: "SDI",
      shift: "siang",
      sleep: j(8, 10),
      st: "fit",
      hist: [1, 1, 1, 1, 1, 1, 1],
    },
    {
      name: "Joko Widodo S.",
      nik: "503264139",
      dept: "Operation",
      shift: "siang",
      sleep: "—",
      st: "belum",
      hist: [1, 1, 1, 0, 1, -1, -1],
    },
    {
      name: "Agus Salim",
      nik: "503264141",
      dept: "Plant",
      shift: "malam",
      sleep: j(3, 55),
      st: "kurang",
      hist: [0, 1, 0, 1, 0, 0, 0],
    },
    {
      name: "Maya Sari",
      nik: "503264142",
      dept: "Operation",
      shift: "malam",
      sleep: j(6, 15),
      st: "fit",
      hist: [1, 1, 1, 1, 1, 1, 1],
    },
    {
      name: "Hendra Gunawan",
      nik: "503264143",
      dept: "Plant",
      shift: "malam",
      sleep: "—",
      st: "belum",
      hist: [1, 1, 1, 1, -1, 1, -1],
    },
  ];
}

/* status hari ke-d (0=hari ini) — 7 hari pertama dari hist, sisanya deterministik */
export function ftwStAt(rec: FtwRecord, d: number): number {
  if (d < 7) return rec.hist[6 - d];
  return [1, 1, 0, 1, 1, 1, 1][(d + rec.nik.charCodeAt(8)) % 7];
}

export type FtwHistEntry = {
  d: number;
  iso: string;
  date: string;
  st: number;
  sleep: string;
  sendTime: string;
};

/* riwayat N hari per operator (default 90) + waktu kirim log */
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
    let sleep: string;
    if (st === 1) {
      const m1 = (d * 37) % 120;
      sleep = `${6 + Math.floor(m1 / 60)}${en ? " h " : " j "}${m1 % 60 < 10 ? "0" : ""}${m1 % 60} m`;
    } else if (st === 0) {
      const m2 = (d * 23) % 100;
      sleep = `${3 + Math.floor(m2 / 60)}${en ? " h " : " j "}${m2 % 60 < 10 ? "0" : ""}${m2 % 60} m`;
    } else {
      sleep = "—";
    }
    let send = "—";
    if (st !== -1) {
      const hh = rec.shift === "malam" ? 16 + (d % 3) : 3 + (d % 3);
      const mm = (d * 17 + rec.nik.charCodeAt(8)) % 60;
      send = `${hh < 10 ? "0" : ""}${hh}:${mm < 10 ? "0" : ""}${mm} WITA`;
    }
    out.push({ d, iso, date: dateLbl, st, sleep, sendTime: send });
  }
  return out;
}

/* strip 7 hari berakhir di hari ke-d */
export function ftwStripAt(rec: FtwRecord, d: number): ("ok" | "bad" | "na")[] {
  const out: ("ok" | "bad" | "na")[] = [];
  for (let k = 6; k >= 0; k--) {
    const x = ftwStAt(rec, d + k);
    out.push(x === 1 ? "ok" : x === 0 ? "bad" : "na");
  }
  return out;
}

import { unitsDb } from "@/lib/data/units-db";

/* Data layar display (TV) — display tampil id-only.
   Satu layar = satu domain: attendance (kehadiran), fitwork (kelayakan kerja),
   fleet (status unit + formasi), fingerprint (kesehatan mesin) — tanpa
   tumpang tindih informasi antar layar. */

export type DisplayTone = "success" | "warning" | "danger" | "neutral" | "info";

/* Running text per layar — dari master Running Text yang dikelola admin */
export const displayRuntext: Record<
  "att" | "ftw" | "fleet" | "finger",
  string
> = {
  att: "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
  ftw: "Rapat P5M setiap pergantian shift di front masing-masing.",
  fleet: "Wajib P2H sebelum mengoperasikan unit.",
  finger: "Wajib P2H sebelum mengoperasikan unit.",
};

/* ===== Attendance — murni kehadiran (siapa sudah/belum datang) =====
   belum absen & terlambat selalu teratas */
export type DisplayAttRow = {
  nik: string;
  name: string;
  pos: string;
  dept: string;
  tone: DisplayTone;
  label: string;
};

export const displayAttRows: DisplayAttRow[] = [
  {
    nik: "503264139",
    name: "Joko Widodo S.",
    pos: "Operator Grader",
    dept: "Operation",
    tone: "danger",
    label: "Belum absen",
  },
  {
    nik: "503264135",
    name: "Budi Santoso",
    pos: "Operator Excavator",
    dept: "HRGA",
    tone: "danger",
    label: "Belum absen",
  },
  {
    nik: "503264141",
    name: "Agus Salim",
    pos: "Welder",
    dept: "Plant",
    tone: "danger",
    label: "Belum absen",
  },
  {
    nik: "503264137",
    name: "Andi Prasetyo",
    pos: "Mekanik",
    dept: "Plant",
    tone: "warning",
    label: "Terlambat",
  },
  {
    nik: "503264133",
    name: "First Angel Paustine",
    pos: "Operator Dump Truck",
    dept: "Operation",
    tone: "success",
    label: "Hadir",
  },
  {
    nik: "503264136",
    name: "Siti Nurhaliza",
    pos: "Operator Dump Truck",
    dept: "Operation",
    tone: "success",
    label: "Hadir",
  },
  {
    nik: "503264150",
    name: "Rizky Ananda",
    pos: "Operator HD / Excavator",
    dept: "Operation",
    tone: "success",
    label: "Hadir",
  },
  {
    nik: "503264143",
    name: "Hendra Gunawan",
    pos: "Mekanik Senior",
    dept: "Plant",
    tone: "success",
    label: "Hadir",
  },
  {
    nik: "503264138",
    name: "Dewi Lestari",
    pos: "Staff Administrasi",
    dept: "SDI",
    tone: "success",
    label: "Hadir",
  },
  {
    nik: "503264134",
    name: "Rahmat Hidayat",
    pos: "Admin Roster",
    dept: "SDI",
    tone: "success",
    label: "Hadir",
  },
];

/* ===== Fit to work — murni kelayakan kerja (jam tidur + waktu lapor) =====
   kurang tidur & belum lapor selalu teratas */
export type DisplayFtwRow = {
  nik: string;
  name: string;
  pos: string;
  dept: string;
  sleep: string;
  note: string;
  tone: DisplayTone;
  label: string;
};

export const displayFtwRows: DisplayFtwRow[] = [
  {
    nik: "503264135",
    name: "Budi Santoso",
    pos: "Operator Excavator",
    dept: "HRGA",
    sleep: "3 j 40 m",
    note: "Di bawah ambang 4 jam — butuh penggantian",
    tone: "danger",
    label: "Kurang tidur",
  },
  {
    nik: "503264141",
    name: "Agus Salim",
    pos: "Welder",
    dept: "Plant",
    sleep: "3 j 55 m",
    note: "Di bawah ambang 4 jam — butuh penggantian",
    tone: "danger",
    label: "Kurang tidur",
  },
  {
    nik: "503264139",
    name: "Joko Widodo S.",
    pos: "Operator Grader",
    dept: "Operation",
    sleep: "—",
    note: "Belum mengirim log — hubungi sebelum shift",
    tone: "warning",
    label: "Belum lapor",
  },
  {
    nik: "503264143",
    name: "Hendra Gunawan",
    pos: "Mekanik Senior",
    dept: "Plant",
    sleep: "—",
    note: "Belum mengirim log — hubungi sebelum shift",
    tone: "warning",
    label: "Belum lapor",
  },
  {
    nik: "503264133",
    name: "First Angel Paustine",
    pos: "Operator Dump Truck",
    dept: "Operation",
    sleep: "7 j 10 m",
    note: "Lapor 03:51 WITA",
    tone: "success",
    label: "Fit",
  },
  {
    nik: "503264136",
    name: "Siti Nurhaliza",
    pos: "Operator Dump Truck",
    dept: "Operation",
    sleep: "6 j 45 m",
    note: "Lapor 03:54 WITA",
    tone: "success",
    label: "Fit",
  },
  {
    nik: "503264142",
    name: "Maya Sari",
    pos: "Operator Water Truck",
    dept: "Operation",
    sleep: "8 j 05 m",
    note: "Lapor 16:05 WITA",
    tone: "success",
    label: "Fit",
  },
  {
    nik: "503264150",
    name: "Rizky Ananda",
    pos: "Operator HD / Excavator",
    dept: "Operation",
    sleep: "7 j 30 m",
    note: "Lapor 04:02 WITA",
    tone: "success",
    label: "Fit",
  },
  {
    nik: "503264138",
    name: "Dewi Lestari",
    pos: "Staff Administrasi",
    dept: "SDI",
    sleep: "7 j 20 m",
    note: "Lapor 04:10 WITA",
    tone: "success",
    label: "Fit",
  },
  {
    nik: "503264134",
    name: "Rahmat Hidayat",
    pos: "Admin Roster",
    dept: "SDI",
    sleep: "6 j 45 m",
    note: "Lapor 03:52 WITA",
    tone: "success",
    label: "Fit",
  },
];

/* ===== Fleet — kartu operator per unit (foto, NIK, nama, unit) =====
   satu layar = satu formasi dari Setting Fleet (digger + maks. 13 OHT);
   status unit ikut Database Unit, OPERATOR ikut alokasi harian (faAlloc) —
   layar hanya memantulkan papan Fleet Allocation, tanpa data sendiri.
   Breakdown selalu di urutan teratas. */
export type DisplayFleetCard = {
  code: string;
  opName: string | null;
  opNik: string | null;
  tone: DisplayTone;
  label: string;
};

export function fleetDisplayCards(
  fleet: { digger: string; units: string[] },
  alloc: Record<string, string>,
  nameOfNik: (nik: string) => string | undefined
): DisplayFleetCard[] {
  const codes = [fleet.digger, ...fleet.units];
  const cards = codes.map((code): DisplayFleetCard => {
    const u = unitsDb.find((x) => x.code === code);
    if (u?.breakdown || u?.active === false)
      return {
        code,
        opName: null,
        opNik: null,
        tone: "danger",
        label: "Breakdown",
      };
    if (u?.standby)
      return {
        code,
        opName: null,
        opNik: null,
        tone: "neutral",
        label: "Standby",
      };
    const nik = alloc[code];
    const opName = (nik && nameOfNik(nik)) || null;
    return {
      code,
      opName,
      opNik: opName && nik ? nik : null,
      tone: "success",
      label: "Ready",
    };
  });
  const rank = (c: DisplayFleetCard) =>
    c.tone === "danger" ? 0 : c.tone === "success" ? 1 : 2;
  return cards.sort((a, b) => rank(a) - rank(b));
}

/* ===== Fingerprint — kesehatan mesin (offline selalu teratas) ===== */
export type DisplayMachine = {
  id: string;
  loc: string;
  online: boolean;
  meta: string;
};

export const displayMachines: DisplayMachine[] = [
  {
    id: "FP-07",
    loc: "Gate selatan",
    online: false,
    meta: "terakhir aktif 04:52",
  },
  {
    id: "FP-11",
    loc: "Mess Karang Joang",
    online: false,
    meta: "terakhir aktif kemarin 21:14",
  },
  { id: "FP-01", loc: "Kantor SDI", online: true, meta: "312 scan" },
  { id: "FP-02", loc: "Gate utara", online: true, meta: "284 scan" },
  { id: "FP-03", loc: "Gate selatan", online: true, meta: "201 scan" },
  { id: "FP-04", loc: "Workshop Plant", online: true, meta: "145 scan" },
  { id: "FP-05", loc: "Kantor HRGA", online: true, meta: "98 scan" },
  { id: "FP-06", loc: "Pit utara", online: true, meta: "64 scan" },
  { id: "FP-08", loc: "Pit selatan", online: true, meta: "52 scan" },
  { id: "FP-09", loc: "Warehouse", online: true, meta: "31 scan" },
  { id: "FP-10", loc: "Kantin", online: true, meta: "14 scan" },
  { id: "FP-12", loc: "Klinik", online: true, meta: "7 scan" },
];

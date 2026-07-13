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
   breakdown selalu di urutan teratas */
export type DisplayFleetCard = {
  code: string;
  type: string;
  opName: string | null;
  opNik: string | null;
  tone: DisplayTone;
  label: string;
};

export const displayFleetCards: DisplayFleetCard[] = [
  {
    code: "RD5004",
    type: "777E · CATERPILLAR",
    opName: null,
    opNik: null,
    tone: "danger",
    label: "Breakdown",
  },
  {
    code: "RD5047",
    type: "777E · CATERPILLAR",
    opName: null,
    opNik: null,
    tone: "danger",
    label: "Breakdown",
  },
  {
    code: "RD5080",
    type: "HD785-7 · KOMATSU",
    opName: null,
    opNik: null,
    tone: "danger",
    label: "Breakdown",
  },
  {
    code: "EX7001",
    type: "EX2000-7BH · HITACHI",
    opName: "David Pakiding",
    opNik: "503264151",
    tone: "success",
    label: "Ready",
  },
  {
    code: "RD5001",
    type: "777E · CATERPILLAR",
    opName: "First Angel Paustine",
    opNik: "503264133",
    tone: "success",
    label: "Ready",
  },
  {
    code: "RD5002",
    type: "777E · CATERPILLAR",
    opName: "Siti Nurhaliza",
    opNik: "503264136",
    tone: "success",
    label: "Ready",
  },
  {
    code: "EX7007",
    type: "PC2000-11 · KOMATSU",
    opName: "Hendrik",
    opNik: "503264149",
    tone: "success",
    label: "Ready",
  },
  {
    code: "RD5061",
    type: "HD785-7 · KOMATSU",
    opName: "Rizky Ananda",
    opNik: "503264150",
    tone: "success",
    label: "Ready",
  },
  {
    code: "WT1009",
    type: "K460 6x6 · RENAULT",
    opName: "Maya Sari",
    opNik: "503264142",
    tone: "success",
    label: "Ready",
  },
  {
    code: "GD5001",
    type: "16GC · CATERPILLAR",
    opName: null,
    opNik: null,
    tone: "neutral",
    label: "Standby",
  },
];

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

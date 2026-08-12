/* Data layar display (TV) — display tampil id-only.
   Satu layar = satu domain: attendance (kehadiran), fitwork (kelayakan kerja),
   fleet (status unit + formasi), fingerprint (kesehatan mesin) — tanpa
   tumpang tindih informasi antar layar. */

export type DisplayTone = "success" | "warning" | "danger" | "neutral" | "info";

/* ===== Attendance — murni kehadiran (siapa sudah/belum datang) =====
   Data diambil dari backend API GET /api/display/attendance. */
export type DisplayAttRow = {
  nik: string;
  name: string;
  pos: string;
  dept: string;
  tone: DisplayTone;
  label: string;
};

/* ===== Fit to work — murni kelayakan kerja (jam tidur + waktu lapor) =====
   Data diambil dari backend API GET /api/display/ftw. */
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

/* ===== Fingerprint — kesehatan mesin (offline selalu teratas) ===== */
export type DisplayMachine = {
  id: string;
  loc: string;
  online: boolean;
  meta: string;
};

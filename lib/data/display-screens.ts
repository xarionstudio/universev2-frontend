import { attDayRows } from "@/lib/data/attendance";
import { employees } from "@/lib/data/employees";
import { ftwData, ftwHistoryFor } from "@/lib/data/ftw";
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
   DITURUNKAN dari log absensi hari berjalan (attendance.ts) + jabatan dari
   master karyawan — sumber yang sama dengan halaman admin. "Off" tidak tampil
   (bukan roster hari ini); "unfit" tetap Hadir di layar ini (kelayakan kerja
   adalah domain layar Fit To Work). Belum absen & terlambat selalu teratas. */
export type DisplayAttRow = {
  nik: string;
  name: string;
  pos: string;
  dept: string;
  tone: DisplayTone;
  label: string;
};

const posByNik = new Map(employees.map((e) => [e.nik, e.pos]));

const ATT_TONE: Record<
  string,
  { tone: DisplayTone; label: string; rank: number }
> = {
  belum: { tone: "danger", label: "Belum absen", rank: 0 },
  terlambat: { tone: "warning", label: "Terlambat", rank: 1 },
  hadir: { tone: "success", label: "Hadir", rank: 2 },
  unfit: { tone: "success", label: "Hadir", rank: 2 },
};

export function displayAttRowsNow(): DisplayAttRow[] {
  return attDayRows("id", false)
    .filter((r) => r.st !== "off")
    .map((r) => ({
      row: {
        nik: r.nik,
        name: r.name,
        pos: posByNik.get(r.nik) ?? "—",
        dept: r.dept,
        tone: ATT_TONE[r.st].tone,
        label: ATT_TONE[r.st].label,
      },
      rank: ATT_TONE[r.st].rank,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.row);
}

/* ===== Fit to work — murni kelayakan kerja (jam tidur + waktu lapor) =====
   DITURUNKAN dari log tidur (ftw.ts) + jabatan dari master karyawan — sumber
   yang sama dengan halaman admin. Kurang tidur & belum lapor selalu teratas. */
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

const FTW_TONE: Record<
  string,
  { tone: DisplayTone; label: string; rank: number }
> = {
  kurang: { tone: "danger", label: "Kurang tidur", rank: 0 },
  belum: { tone: "warning", label: "Belum lapor", rank: 1 },
  fit: { tone: "success", label: "Fit", rank: 2 },
};

export function displayFtwRowsNow(): DisplayFtwRow[] {
  return ftwData("id")
    .map((r) => ({
      row: {
        nik: r.nik,
        name: r.name,
        pos: posByNik.get(r.nik) ?? "—",
        dept: r.dept,
        sleep: r.sleep,
        note:
          r.st === "kurang"
            ? "Jam tidur di bawah ambang — butuh penggantian"
            : r.st === "belum"
              ? "Belum mengirim log — hubungi sebelum shift"
              : `Lapor ${ftwHistoryFor(r, "id", 1)[0].sendTime}`,
        tone: FTW_TONE[r.st].tone,
        label: FTW_TONE[r.st].label,
      },
      rank: FTW_TONE[r.st].rank,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.row);
}

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
    loc: "Mess 31",
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

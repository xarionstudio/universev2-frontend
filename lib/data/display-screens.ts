import { attDayRows } from "@/lib/data/attendance";
import { employees } from "@/lib/data/employees";
import { fpScanCount, type FpMachine } from "@/lib/data/fingerprint";
import { ftwData, ftwHistoryFor, type FtwStatus } from "@/lib/data/ftw";
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

/* Diketik dengan FtwStatus (bukan string) supaya penambahan status baru
   ketahuan saat kompilasi — versi Record<string,…> sebelumnya membuat
   status tak dikenal lolos dan baru meledak saat render. */
const FTW_TONE: Record<
  FtwStatus,
  { tone: DisplayTone; label: string; rank: number }
> = {
  pulang: { tone: "danger", label: "Dipulangkan", rank: 0 },
  spare: { tone: "warning", label: "Spare", rank: 1 },
  belum: { tone: "warning", label: "Belum lapor", rank: 2 },
  fit: { tone: "success", label: "Fit", rank: 3 },
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
          r.st === "pulang"
            ? "Tidur < 4 jam — dipulangkan, butuh penggantian"
            : r.st === "spare"
              ? `Spare — istirahat ${r.restHours} jam sebelum boleh bekerja`
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

/* ===== Fingerprint — kesehatan mesin (offline selalu teratas) =====
   DITURUNKAN dari master mesin (fingerprint.ts) yang dikelola modul admin
   Mesin Fingerprint — sumber yang sama dengan halaman admin. Layar
   ini dulu memegang daftarnya sendiri, sehingga IP mesin tidak punya tempat
   untuk didaftarkan dan dua daftar bisa berbeda tanpa ketahuan. */
export type DisplayMachine = {
  id: string;
  loc: string;
  online: boolean;
  meta: string;
};

export function fpDisplayMachines(list: FpMachine[]): DisplayMachine[] {
  return (
    list
      .filter((m) => m.active)
      .map((m) => ({ id: m.id, loc: m.loc, online: m.online, meta: m.meta }))
      /* offline dulu, lalu tersibuk, lalu kode — urutan boolean saja membuat
       posisi kartu ikut berubah setiap daftar mesin disunting */
      .sort(
        (a, b) =>
          Number(a.online) - Number(b.online) ||
          fpScanCount(b.meta) - fpScanCount(a.meta) ||
          a.id.localeCompare(b.id)
      )
  );
}

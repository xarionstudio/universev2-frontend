import { employees, withKomp } from "./employees";
import { initialFleets } from "./fleet";
import { operatorAllocSeed, operatorSeed } from "./operators";
import { typeOfEgi, unitsDb } from "./units-db";

/* Alokasi operator→unit per TANGGAL + SHIFT — pengganti file setting-operator
   bulanan (30 sheet Excel). Bentuk: alloc[tanggalISO][shift][kodeUnit] = nik */
export type FaShift = "pagi" | "malam";
export type FaAlloc = Record<
  string,
  Partial<Record<FaShift, Record<string, string>>>
>;

export function isoAddDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/* Seed alokasi satu shift — DUA lapis, berurutan:

     1. Penugasan sebenarnya dari docs/setting-operator.xlsx (operators.ts).
        Ini yang mengisi hampir seluruh formasi, dan karena sumbernya sama
        dengan yang membentuk fleet.ts, pasangan operator-unitnya konsisten.
     2. Sisa unit yang tidak ada di file sumber diisi greedy seperti dulu:
        operator berkompetensi cocok yang belum terpakai di shift itu.

   Lapis kedua tetap ada supaya unit yang ditambahkan lewat Setting Fleet
   setelah file sumber dibuat tidak langsung kosong di layar. */
function seedShift(
  shift: FaShift,
  priorityFleetIds: string[]
): Record<string, string> {
  const byCode = new Map(unitsDb.map((u) => [u.code, u]));
  const ops = withKomp(employees.concat(operatorSeed)).filter(
    (e) => e.status === "aktif" && e.komp && e.komp.length
  );
  const used = new Set<string>();
  const out: Record<string, string> = {};

  for (const [code, nik] of Object.entries(operatorAllocSeed[shift])) {
    const u = byCode.get(code);
    /* unit rusak/standby sengaja DILEWATI walau ada di file sumber: papan
       alokasi dan layar TV membaca status unit dari Database Unit, dan
       operator yang menempel di unit breakdown akan tampil sebagai kru yang
       seolah tetap bekerja pada alat yang tidak jalan */
    if (!u || !u.active || u.breakdown || u.standby) continue;
    if (used.has(nik)) continue;
    used.add(nik);
    out[code] = nik;
  }

  const rank = (f: { id: string }) => {
    const i = priorityFleetIds.indexOf(f.id);
    return i === -1 ? priorityFleetIds.length : i;
  };
  const ordered = initialFleets
    .filter((x) => x.active)
    .sort((a, b) => rank(a) - rank(b));
  for (const f of ordered) {
    for (const code of [f.digger, ...f.units]) {
      if (out[code]) continue;
      const u = byCode.get(code);
      if (!u || !u.active || u.breakdown || u.standby) continue;
      const tegi = typeOfEgi(u.egi);
      const op = ops.find(
        (o) => !used.has(o.nik) && o.komp!.some((k) => k.cls === tegi)
      );
      if (!op) continue;
      used.add(op.nik);
      out[code] = op.nik;
    }
  }
  return out;
}

/* Alokasi awal untuk tanggal-tanggal demo. Shift pagi & malam kini diseed
   TERPISAH — file setting operator memang memuat kru yang berbeda untuk
   SHIFT SIANG dan SHIFT MALAM, jadi menyalin satu mapping ke keduanya seperti
   sebelumnya akan menampilkan orang yang sama bekerja 24 jam. */
export function seedFaAlloc(
  dates: string[],
  priorityFleetIds: string[] = []
): FaAlloc {
  const pagi = seedShift("pagi", priorityFleetIds);
  const malam = seedShift("malam", priorityFleetIds);
  const alloc: FaAlloc = {};
  for (const d of dates) alloc[d] = { pagi: { ...pagi }, malam: { ...malam } };
  return alloc;
}

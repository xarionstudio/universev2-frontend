import { employees, withKomp } from "./employees";
import { initialFleets } from "./fleet";
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

/* Seed demo: greedy — telusuri formasi fleet aktif, isi unit yang beroperasi
   dengan operator berkompetensi yang belum terpakai di shift itu.
   Fleet yang punya display TV didahulukan (pool operator mock terbatas). */
function seedShift(priorityFleetIds: string[]): Record<string, string> {
  const byCode = new Map(unitsDb.map((u) => [u.code, u]));
  const ops = withKomp(employees).filter(
    (e) => e.status === "aktif" && e.komp && e.komp.length
  );
  const used = new Set<string>();
  const out: Record<string, string> = {};
  const rank = (f: { id: string }) => {
    const i = priorityFleetIds.indexOf(f.id);
    return i === -1 ? priorityFleetIds.length : i;
  };
  const ordered = initialFleets
    .filter((x) => x.active)
    .sort((a, b) => rank(a) - rank(b));
  for (const f of ordered) {
    for (const code of [f.digger, ...f.units]) {
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

/* Alokasi awal untuk tanggal-tanggal demo — kedua shift diisi mapping yang
   sama (dummy; aslinya crew siang & malam berbeda orang) */
export function seedFaAlloc(
  dates: string[],
  priorityFleetIds: string[] = []
): FaAlloc {
  const base = seedShift(priorityFleetIds);
  const alloc: FaAlloc = {};
  for (const d of dates) alloc[d] = { pagi: { ...base }, malam: { ...base } };
  return alloc;
}

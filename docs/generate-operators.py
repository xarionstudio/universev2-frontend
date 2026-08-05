#!/usr/bin/env python3
"""Generate lib/data/operators.ts dari docs/setting-operator.xlsx.

Isinya DUA tabel, keduanya diambil apa adanya dari sheet tanggal 1:
  1. Daftar operator (NIK + NAMA) yang benar-benar dipakai formasi fleet.
  2. Alokasi operator->unit per shift (SHIFT SIANG -> pagi, SHIFT MALAM -> malam).

Yang SENGAJA TIDAK dihitung di sini: kompetensi (Type EGI) operator. Pemetaan
model unit -> Type EGI hidup di typeOfEgi() pada lib/data/units-db.ts, dan
menyalinnya ke Python berarti dua salinan aturan yang sama yang akan menyimpang
diam-diam. Skrip ini hanya mengeluarkan "operator X mengoperasikan unit Y";
kompetensinya diturunkan di TypeScript dari unit itu.

Butuh: pip install openpyxl. Jalankan ulang bila file sumber berubah:
  python3 docs/generate-operators.py
"""

import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "docs" / "setting-operator.xlsx"
FLEET_TS = ROOT / "lib" / "data" / "fleet.ts"
EMP_TS = ROOT / "lib" / "data" / "employees.ts"
OUT = ROOT / "lib" / "data" / "operators.ts"

SHEET = "1"
SHIFTS = {"SHIFT SIANG": "pagi", "SHIFT MALAM": "malam"}

# unit yang dipakai formasi fleet — hanya operator merekalah yang perlu diseed
src = FLEET_TS.read_text(encoding="utf-8")
fleet_units = set(re.findall(r'digger: "([A-Z0-9]+)"', src)) | set(
    re.findall(r'"([A-Z]{2}\d{4})"', src)
)

# NIK yang sudah ada di master karyawan tulis-tangan tidak boleh diduplikasi
existing_niks = set(re.findall(r'nik: "(\d+)"', EMP_TS.read_text(encoding="utf-8")))

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb[SHEET]
rows = [r for r in ws.iter_rows(values_only=True) if any(v is not None for v in r)]
hdr, data = rows[0], rows[1:]
c = {h: i for i, h in enumerate(hdr) if h}

# alloc[shift][unit] = nik ; nama[nik] = NAMA
alloc = {v: {} for v in SHIFTS.values()}
names = {}
for r in data:
    shift = SHIFTS.get(str(r[c["SHIFT DETIL"]] or "").strip())
    if not shift:
        continue
    unit = str(r[c["UNIT"]] or "").strip().upper()
    nik, nama = r[c["NIK"]], r[c["NAMA"]]
    if unit not in fleet_units or not nik or not nama:
        continue
    nik = str(nik).strip()
    nama = " ".join(str(nama).split()).title()
    if nik in existing_niks:
        continue
    # baris pertama menang: satu unit bisa muncul lebih dari sekali per shift
    alloc[shift].setdefault(unit, nik)
    names.setdefault(nik, nama)

used = {nik for m in alloc.values() for nik in m.values()}
ops = sorted((nik, names[nik]) for nik in used)

op_lines = "\n".join(f"{nik}|{nama}" for nik, nama in ops)
alloc_lines = "\n".join(
    f"{u}|{alloc['pagi'].get(u, '')}|{alloc['malam'].get(u, '')}"
    for u in sorted(set(alloc["pagi"]) | set(alloc["malam"]))
)

OUT.write_text(
    f'''/* Operator lapangan + alokasi harian — DIGENERATE dari
   docs/setting-operator.xlsx (sheet tanggal 1). JANGAN edit manual —
   jalankan: python3 docs/generate-operators.py

   Kenapa ada berkas ini: master karyawan tulis-tangan di employees.ts berisi
   {len(existing_niks)} persona desain — cukup untuk halaman Attendance, Fit To Work, dan
   Prestasi (ketiganya punya seed sendiri), tapi tidak cukup untuk MENGISI
   formasi fleet. Akibatnya layar TV fleet menampilkan "Belum ada operator" di
   hampir semua kartu, yang terbaca sebagai layar rusak, bukan sebagai data
   kosong. Nama & NIK di sini nyata dari file setting operator, jadi layar
   memantulkan penugasan yang sebenarnya, bukan tebakan greedy.

   Field selain NIK & NAMA (departemen, mess, kontak, dst.) TIDAK ada di file
   sumber; nilainya deterministik dari NIK, sama seperti lokasi & status dummy
   pada units-db.ts. Kompetensi TIDAK di-hardcode — diturunkan dari unit yang
   benar-benar dioperasikan lewat typeOfEgi(), agar tidak pernah berbeda dengan
   aturan di modul lain. */

import {{ typeOfEgi, unitsDb }} from "./units-db";

import type {{ Employee, Komp }} from "./employees";

/* nik|nama */
const rawOps = `{op_lines}`;

/* unit|nikPagi|nikMalam ("" = tidak ada penugasan di shift itu) */
const rawAlloc = `{alloc_lines}`;

export type OperatorAlloc = {{
  pagi: Record<string, string>;
  malam: Record<string, string>;
}};

/* Alokasi nyata per shift — dipakai sebagai seed papan Fleet Allocation dan,
   lewat papan itu, oleh seluruh layar display. */
export const operatorAllocSeed: OperatorAlloc = (() => {{
  const pagi: Record<string, string> = {{}};
  const malam: Record<string, string> = {{}};
  for (const line of rawAlloc.split("\\n")) {{
    const [unit, p, m] = line.split("|");
    if (p) pagi[unit] = p;
    if (m) malam[unit] = m;
  }}
  return {{ pagi, malam }};
}})();

/* Kompetensi diturunkan dari unit yang dioperasikan operator itu di kedua
   shift: satu entri per Type EGI, tanpa duplikat. */
const egiByCode = new Map(unitsDb.map((u) => [u.code, u.egi]));
const kompByNik = (() => {{
  const out = new Map<string, Komp[]>();
  for (const map of [operatorAllocSeed.pagi, operatorAllocSeed.malam]) {{
    for (const [unit, nik] of Object.entries(map)) {{
      const egi = egiByCode.get(unit);
      if (!egi) continue;
      const cls = typeOfEgi(egi);
      const list = out.get(nik) ?? [];
      if (!list.some((k) => k.cls === cls))
        list.push({{ cls, simper: "Kelas B", exp: "2027-06-30" }});
      out.set(nik, list);
    }}
  }}
  return out;
}})();

/* Nilai deterministik dari NIK — tidak acak, supaya render server & klien
   selalu sama dan tidak ada hydration mismatch. */
function pick<T>(nik: string, list: T[]): T {{
  let h = 0;
  for (let i = 0; i < nik.length; i++) h = (h * 31 + nik.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}}

const MESS = ["Mess 31", "Mess 32", "Mess 33", "Mess Sebatik"];
const BLOOD = ["A", "B", "AB", "O"];
const MCU = ["Fit", "Fit with note"];

export const operatorSeed: Employee[] = rawOps.split("\\n").map((line) => {{
  const [nik, name] = line.split("|");
  const komp = kompByNik.get(nik) ?? [];
  return {{
    name,
    nik,
    dept: "Operation",
    pos: komp.length ? `Operator ${{komp[0].cls}}` : "Operator",
    simper: komp.length ? "Kelas B" : "",
    simperExp: "2027-06-30",
    status: "aktif" as const,
    company: "PT Unggul Dinamika Utama",
    equip: komp.map((k) => k.cls).join(", "),
    join: "2024-01-15",
    exp: "",
    license: "SIM B2 Umum",
    mcu: pick(nik, MCU),
    medis: "",
    blood: pick(nik, BLOOD),
    bpjs: "Aktif",
    mess: pick(nik, MESS),
    kamar: String((Number(nik.slice(-3)) % 40) + 1).padStart(2, "0"),
    hp: "",
    emg: "",
    komp,
  }};
}});
''',
    encoding="utf-8",
)

print(f"operator: {len(ops)}")
print(f"unit teralokasi: pagi {len(alloc['pagi'])}, malam {len(alloc['malam'])}")
print(f"ditulis: {OUT.relative_to(ROOT)}")

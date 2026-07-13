#!/usr/bin/env python3
"""Generate lib/data/fleet.ts dari docs/setting-operator.xlsx (+ equipment.json).

Formasi fleet = 1 big/medium digger + truk OHT/DT yang beroperasi di pit yang
sama (sheet tanggal 1, shift siang), dibagi rata antar digger se-pit, maks. 13
truk per fleet. Nama pit dipetakan ke lokasi resmi (equipment.json).

Butuh: pip install openpyxl. Jalankan ulang bila file sumber berubah:
  python3 docs/generate-fleets.py
"""

import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "docs" / "setting-operator.xlsx"
EQ = ROOT / "docs" / "equipment.json"
OUT = ROOT / "lib" / "data" / "fleet.ts"

MAX_UNITS = 13

# nama pit operasional (xlsx) → lokasi resmi (master Area)
PIT_MAP = {
    "PANEL EAST -PUNCAK UTARA": "Panel East Puncak Utara",
    "PANEL EAST -PUNCAK SELATAN": "Panel East Puncak Selatan",
    "PANEL EAST - TENGAH SELATAN": "Panel East Tengah",
    "PANEL EAST - BAWAH": "Panel East Bawah",
    "KASTURI PUNCAK": "Kasturi Puncak",
    "KASTURI TENGAH": "Kasturi Tengah",
    "KASTURI TENGAH.": "Kasturi Tengah",
    "KASTURI BAWAH ARAH KOLAM": "Kasturi Bawah",
    "MANDALIKA": "Mandalika",
    "PIT SERVICE": "Pit Service",
}

eq = json.loads(EQ.read_text())["equipment"]
cat_of = {u["unitId"]: u["category"] for u in eq}
ids = set(cat_of)

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb["1"]
rows = [r for r in ws.iter_rows(values_only=True) if any(v is not None for v in r)]
hdr, data = rows[0], rows[1:]
c = {h: i for i, h in enumerate(hdr) if h}
siang = [r for r in data if r[c["SHIFT DETIL"]] == "SHIFT SIANG"]

# digger big/medium per pit (urut kemunculan)
diggers = []
for r in siang:
    u, pit = str(r[c["UNIT"]]), str(r[c["PIT"]])
    if cat_of.get(u) in ("BIG_DIGGER", "MEDIUM_DIGGER") and u not in [d for d, _ in diggers]:
        diggers.append((u, pit))

# truk OHT/DT per pit — hanya kode yang valid di equipment.json, tanpa duplikat
trucks_by_pit = {}
seen = set()
for r in siang:
    u, pit, tipe = str(r[c["UNIT"]]), str(r[c["PIT"]]), str(r[c["TIPE UNIT"]])
    if tipe not in ("OHT", "DT") or u in seen or u not in ids:
        continue
    seen.add(u)
    trucks_by_pit.setdefault(pit, []).append(u)

# bagi rata truk se-pit ke digger se-pit (round-robin), maks. 13
fleets = []
for pit in dict.fromkeys(p for _, p in diggers):
    digs = [d for d, p in diggers if p == pit]
    pool = trucks_by_pit.get(pit, [])
    buckets = {d: [] for d in digs}
    i = 0
    for tr in pool:
        d = digs[i % len(digs)]
        if len(buckets[d]) < MAX_UNITS:
            buckets[d].append(tr)
        i += 1
    for d in digs:
        fleets.append((d, PIT_MAP.get(pit, pit.title()), buckets[d]))

fleets.sort(key=lambda f: f[0])

# bus default bergilir dari unit BUS resmi
buses = [u["unitId"] for u in eq if u["equipmentClass"] == "BUS"][:6]

entries = []
for i, (dig, loc, units) in enumerate(fleets):
    unit_lines = ", ".join(f'"{u}"' for u in units)
    entries.append(f'''  {{
    id: "fl-{dig}",
    digger: "{dig}",
    loc: "{loc}",
    bus: "{buses[i % len(buses)]}",
    units: [{unit_lines}],
    active: true,
  }},''')

body = "\n".join(entries)
OUT.write_text(f'''/* Setting fleet — formasi: digger (leader) + unit OHT (maks. 13) + lokasi kerja
   + bus default. DIGENERATE dari docs/setting-operator.xlsx (sheet tanggal 1,
   shift siang) × docs/equipment.json — jangan edit manual, jalankan:
   python3 docs/generate-fleets.py */
export const FLEET_MAX_UNITS = {MAX_UNITS};

export type Fleet = {{
  id: string;
  digger: string;
  loc: string;
  bus: string;
  units: string[];
  active: boolean;
}};

export const initialFleets: Fleet[] = [
{body}
];
''')

total_units = sum(len(u) for _, _, u in fleets)
print(f"OK {len(fleets)} fleet, {total_units} truk → {OUT.relative_to(ROOT)}")
for d, loc, u in fleets:
    print(f"  fl-{d}: {len(u):2d} unit · {loc}")

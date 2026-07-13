#!/usr/bin/env python3
"""Generate lib/data/units-db.ts dari docs/equipment.json.

Sumber kebenaran: docs/equipment.json (ekspor Data_Equipment_Unggul_Update_Juli_2026.xlsx).
Status operasional + lokasi tidak ada di sumber, jadi digenerate dummy DETERMINISTIK
(seed tetap) dan dibake ke file output — semua halaman membaca hasil yang sama.

Jalankan ulang bila equipment.json berubah:
  python3 docs/generate-units-db.py
"""

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "equipment.json"
OUT = ROOT / "lib" / "data" / "units-db.ts"

d = json.loads(SRC.read_text())
eq = d["equipment"]
pits = [p["name"] for p in d["pitLocations"]]

# ---- eq class pendek (badge di UI) dari equipmentClass + kategori ----
CLS_MAP = {
    "EXCAVATOR": "EX", "WHEEL_EXCAVATOR": "WE", "DOZER": "DZ", "GRADER": "GD",
    "BUS": "BUS", "FUEL_TRUCK": "FT", "WATER_TRUCK": "WT", "SERVICE_TRUCK": "ST",
    "CRANE_TRUCK": "CT", "LIGHT_VEHICLE": "LV", "LIGHT_TRUCK": "LT",
    "MANHAUL": "MH", "COMPACTOR": "CM", "DRILL": "DR", "LOWBOY": "LB",
    "TELEHANDLER": "TH", "FORKLIFT": "FK", "AMBULANCE": "AMB",
    "DEWATERING_PUMP": "PU", "BOOSTER_PUMP": "PU", "SLURRY_PUMP": "PU",
    "SUBMERSIBLE_PUMP": "PU", "WATERFILL": "WF",
}
CLS_LABELS = {
    "HD": "Heavy Dump Truck (60–100 t)", "LD": "Light Dump Truck (30–40 t)",
    "EX": "Excavator", "WE": "Wheel Excavator", "DZ": "Dozer", "GD": "Grader",
    "BUS": "Bus Karyawan", "FT": "Fuel Truck", "WT": "Water Truck",
    "ST": "Service Truck", "CT": "Crane Truck", "LV": "Light Vehicle",
    "LT": "Light Truck", "MH": "Manhaul", "CM": "Compactor",
    "DR": "Drill Machine", "LB": "Lowboy", "TH": "Telehandler",
    "FK": "Forklift", "AMB": "Ambulance", "PU": "Pompa Dewatering",
    "WF": "Waterfill Tower",
}


def cls_of(u):
    if u["equipmentClass"] == "DUMP_TRUCK":
        return "HD" if u["category"] in ("DUMP_TRUCK_100T", "DUMP_TRUCK_60T") else "LD"
    return CLS_MAP[u["equipmentClass"]]


# ---- Type EGI (grup kompetensi) — urutan aturan penting, dipakai juga
#      untuk mengemit fungsi TS supaya logika python == TS ----
EGI_RULES = [
    (r"^WT|- ?WT|SYM3256|FM260", "WATER TRUCK"),
    (r"^FT", "FUEL TRUCK"),
    (r"^ST|^CT|XTREM|WB4300", "SUPPORT TRUCK"),
    (r"^MH|- ?MH", "MANHAUL"),
    (r"F84G", "BUS"),
    (r"TRITON|PAJERO|COLDDIESEL|FE71", "LIGHT VEHICLE"),
    (r"785|777", "HD 785 / 777"),
    (r"465|773|TR60", "HD 465 / 773"),
    (r"R100E", "VOLVO"),
    (r"SKT130", "SKT130"),
    (r"SKT105", "SKT105"),
    (r"SYZ ?440|SYZ ?320", "SANY SYZ 440"),
    (r"2600", "PC 2600"),
    (r"2000", "PC 2000"),
    (r"1250", "PC 1250"),
    (r"1200", "PC 1200"),
    (r"6020", "PC 6020"),
    (r"870|SY750", "PC 870"),
    (r"470", "PC 470"),
    (r"ZX350|350|SY365", "PC 350"),
    (r"ZX2[01]0|PC ?200|200-LA|SY2[01]5|215", "PC 200"),
    (r"D375|D9", "D9-375"),
    (r"D155|D8T|D360", "D8-155"),
    (r"D6|D85|D260", "D6-D85SS"),
    (r"GD825|GD755|16GC|14M", "GRADER"),
    (r"P4[16]0", "SCANIA P410"),
    (r"DM30", "DRILL"),
    (r"BW ?2", "COMPACTOR"),
]


def type_of_egi(model):
    m = (model or "").upper()
    for pat, grp in EGI_RULES:
        if re.search(pat, m):
            return grp
    return "SPARE"


# ---- perbaikan make yang tercatat sebagai model (SUSPECT_MAKE) ----
MAKE_FIX = {"K480 8x4": "RENAULT", "K460 6x6": "RENAULT", "HINO 500": "HINO"}

# ---- status operasional dummy (deterministik, seed tetap) ----
rng = random.Random(42)
FORCED = {  # kontinuitas demo fleet EX7001 + contoh lama
    "RD5004": "B", "RD5011": "B", "RD5017": "B",
    "RD5022": "S", "RD5029": "S",
    "EX7008": "S", "EX4002": "B",
}
PROD_CLS = {"HD", "LD", "EX", "DZ", "GD"}

MINING_PITS = [p for p in pits if not re.search(
    r"Workshop|Parki|Pondok|Stock Room|Readyline|CPP", p)]
YARD = ["Workshop", "Readyline", "Parkiran Panel East", "Stock Room T6"]


def status_of(u, cls):
    f = FORCED.get(u["unitId"])
    if f:
        return f
    r = rng.random()
    if cls in PROD_CLS:
        if r < 0.06:
            return "B"
        if r < 0.11:
            return "S"
        if r < 0.125:
            return "N"
    else:
        if r < 0.03:
            return "B"
        if r < 0.06:
            return "S"
        if r < 0.075:
            return "N"
    return "A"


def loc_of(u, cls, st):
    if st == "B" and rng.random() < 0.6:
        return "Workshop"
    if st == "S" and rng.random() < 0.7:
        return "Readyline"
    if cls == "BUS":
        return rng.choice(["Parkiran T6", "Parkitan Sebatik"])
    if cls in ("LV", "LT", "AMB", "FK", "TH", "LB", "CT", "ST"):
        return rng.choice(YARD + ["Pondok Kontainer V Point", "CPP33"])
    if cls in ("PU", "WF"):
        return rng.choice(MINING_PITS + ["CPP33"])
    if cls in PROD_CLS or cls in ("WT", "FT", "MH", "CM", "DR", "WE"):
        return rng.choice(MINING_PITS)
    return "Workshop"


def upd_of(st):
    if st in ("B", "S"):
        return ("2026-07-1" + str(rng.randint(0, 3)), "dispatch")
    if rng.random() < 0.25:
        return (f"202{rng.choice('56')}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}",
                rng.choice(["system", "unggul", "manpower"]))
    return ("", "")


rows, groups, makes = [], set(), set()
for u in eq:
    cls = cls_of(u)
    st = status_of(u, cls)
    loc = loc_of(u, cls, st)
    upd, by = upd_of(st)
    model = u["model"] or ""
    make = MAKE_FIX.get(u["make"], u["make"])
    makes.add(make)
    groups.add(type_of_egi(model))
    flags = {"A": "A", "B": "AB", "S": "AS", "N": "N"}[st]
    for field in (u["unitId"], u["category"], cls, model, make, loc):
        assert "|" not in str(field) and "`" not in str(field), field
    rows.append("|".join([u["unitId"], u["category"], cls, model, make,
                          flags, loc, upd, by]))

# sanity: unit demo fleet harus ada
ids = {u["unitId"] for u in eq}
for c in ["EX7001", "EX7007", "EX8001", "RD5001", "RD5002", "RD5003", "RD5004",
          "RD5005", "RD5006", "RD5011", "RD5013", "RD5014", "RD5015", "RD5017",
          "RD5022", "RD5029", "RD5061", "RD5063", "RD5065", "RD5066",
          "RD5091", "RD5092", "RD5093"]:
    assert c in ids, f"unit demo hilang dari sumber: {c}"

egi_types = sorted(groups)
cls_present = sorted({r.split("|")[2] for r in rows})

# ---- emit TS ----
ts_rules = "\n".join(
    f'  if (/{pat}/.test(e)) return "{grp}";' for pat, grp in EGI_RULES)
raw = "\n".join(rows)
pit_lines = ",\n".join(
    f'  {{ name: "{p["name"]}", mining: {str(p["name"] in MINING_PITS).lower()} }}'
    for p in d["pitLocations"])
cls_lines = ",\n".join(
    f'  ["{c}", "{CLS_LABELS[c]}"]' for c in cls_present)
egi_lines = ",\n".join(f'  "{g}"' for g in egi_types)
make_lines = ",\n".join(f'  "{m}"' for m in sorted(makes))

OUT.write_text(f'''/* Master unit UNIVERSE — DIGENERATE dari docs/equipment.json
   (Data_Equipment_Unggul_Update_Juli_2026.xlsx · sheet ASSET POP · {len(rows)} unit).
   JANGAN edit manual — jalankan: python3 docs/generate-units-db.py
   Status operasional + lokasi tidak ada di sumber; keduanya dummy deterministik
   yang dibake di sini agar SEMUA halaman membaca data yang sama.
   Format: code|category|cls|egi(model)|product(make)|flags|loc|updDate|updBy
   flags: A=aktif, N=nonaktif, S=standby, B=breakdown */
const raw = `{raw}`;

export type UnitDb = {{
  uid: string;
  code: string;
  cat: string;
  cls: string;
  egi: string;
  product: string;
  active: boolean;
  standby: boolean;
  breakdown: boolean;
  loc: string;
  upd: string;
  by: string;
}};

export const unitsDb: UnitDb[] = raw.split("\\n").map((s, i) => {{
  const p = s.split("|");
  return {{
    uid: `u${{i}}`,
    code: p[0],
    cat: p[1],
    cls: p[2],
    egi: p[3],
    product: p[4],
    active: !p[5].includes("N"),
    standby: p[5].includes("S"),
    breakdown: p[5].includes("B"),
    loc: p[6],
    upd: p[7] || "",
    by: p[8] || "",
  }};
}});

/* mapping model unit (kolom EGI) → Type EGI (grup kompetensi operator) */
export function typeOfEgi(egi: string): string {{
  const e = (egi || "").toUpperCase();
{ts_rules}
  return "SPARE";
}}

/* daftar Type EGI — hasil pemetaan seluruh {len(rows)} unit sumber */
export const egiTypes = [
{egi_lines},
  "SPARE",
];

/* eq class yang benar-benar ada di data unit */
export const eqClassDefs: [string, string][] = [
{cls_lines},
];

/* merek/product yang benar-benar ada di data unit */
export const unitMakes = [
{make_lines},
];

/* lokasi pit/area kerja resmi site (dari sheet yang sama) */
export const pitLocations: {{ name: string; mining: boolean }}[] = [
{pit_lines},
];
''')

st_count = {"A": 0, "B": 0, "S": 0, "N": 0}
for r in rows:
    f = r.split("|")[5]
    st_count["B" if "B" in f else "S" if "S" in f else "N" if f == "N" else "A"] += 1
unmapped = sorted({(u["model"] or "") for u in eq
                   if type_of_egi(u["model"]) == "SPARE"})
print(f"OK {len(rows)} unit → {OUT.relative_to(ROOT)}")
print("status:", st_count)
print("egiTypes:", egi_types)
print("cls:", cls_present)
print("model → SPARE:", unmapped)

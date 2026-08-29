import {
  egiTypes,
  eqClassDefs,
  pitLocations,
  unitMakes,
  unitsDb,
} from "./units-db";

/* Master data dinamis (EGI, product, class, area, tempudo, bus, lokasi ex, mess, running text) */
export type MdEntry = {
  id: string;
  name: string;
  a: string;
  b: string;
  active: boolean;
};

export type MdCat =
  | "egi"
  | "product"
  | "eqclass"
  | "area"
  | "tempudo"
  | "bus"
  | "lokasiex"
  | "mess"
  | "runtext";

/* Kategori yang TAMPIL: menggerakkan sidebar (nav.ts) sekaligus validasi
   route /master/[cat] — di luar daftar ini halaman menjawab notFound().

   "tempudo", "bus", dan "lokasiex" sengaja TIDAK ada di sini (dicabut dari
   MVP, 29 Agu 2026) tapi tetap hidup di union MdCat + seed: fleet-setting
   masih membaca opsi bus dari seed store, dan kategori API-nya tidak
   disentuh — hanya halaman kelolanya yang hilang. */
export const mdCats: MdCat[] = [
  "egi",
  "product",
  "eqclass",
  "area",
  "mess",
  "runtext",
];

/* Label kategori — sama di kedua bahasa kecuali beberapa */
export const mdCatLabels: Record<MdCat, { id: string; en: string }> = {
  egi: { id: "Type EGI", en: "EGI Types" },
  product: { id: "Product / Merek", en: "Products / Brands" },
  eqclass: { id: "Eq. Class", en: "Eq. Classes" },
  area: { id: "Area Kerja", en: "Work Areas" },
  tempudo: { id: "Titik Tempudo", en: "Tempudo Points" },
  bus: { id: "Bus", en: "Buses" },
  lokasiex: { id: "Lokasi Excavator", en: "Excavator Locations" },
  mess: { id: "Mess", en: "Mess" },
  runtext: { id: "Running Text", en: "Running Texts" },
};

function mk(cat: string, arr: (string | boolean | undefined)[][]): MdEntry[] {
  return arr.map((a, i) => ({
    id: `${cat}-${i}`,
    name: a[0] as string,
    a: (a[1] as string) || "",
    b: (a[2] as string) || "",
    active: a[3] !== false,
  }));
}

export function mdInit(): Record<MdCat, MdEntry[]> {
  return {
    egi: mk(
      "egi",
      egiTypes.map((n) => [n])
    ),
    /* product/merek, eq class, area & bus disinkronkan dari master unit
       terpusat (equipment.json) — bukan daftar lepas lagi */
    product: mk(
      "product",
      unitMakes.map((n) => [n])
    ),
    eqclass: mk("eqclass", eqClassDefs),
    area: mk(
      "area",
      pitLocations.map((p) => [p.name, p.mining ? "Mining" : "Non-Mining"])
    ),
    tempudo: mk("tempudo", [
      ["TP-01", "Workshop", "Pickup"],
      ["TP-02", "Panel East Tengah", "Pickup & Drop"],
      ["TP-03", "Kasturi Tengah", "Pickup & Drop"],
      ["TP-04", "Parkiran T6", "Pickup", false],
    ]),
    /* sebagian bus sengaja belum terdaftar — tersedia di dropdown "Tambah Entri" */
    bus: mk(
      "bus",
      unitsDb
        .filter((u) => u.cls === "BUS" && u.active)
        .slice(0, 22)
        .map((u, i) => [
          u.code,
          u.egi,
          `05:${String((i % 4) * 15).padStart(2, "0")}`,
        ])
    ),
    /* hanya big/medium digger — selaras aturan dropdown form-nya */
    lokasiex: mk("lokasiex", [
      ["EX7007", "UD-BU06", "TP-02"],
      ["EX6001", "UD-BU07", "TP-02"],
      ["EX5001", "UD-BU07", "TP-03"],
      ["EX7003", "UD-BU08", "TP-01"],
      ["EX7004", "UD-BU06", "TP-04"],
    ]),
    /* mess per blok — sumber dropdown "Mess" di form data karyawan */
    mess: mk("mess", [
      ["Mess 31", "Blok A"],
      ["Mess 31", "Blok C"],
      ["Mess 31", "Blok D"],
      ["Mess KM 12", "Blok B"],
      ["Mess KM 12", "Blok A", "", false],
    ]),
    runtext: mk("runtext", [
      [
        "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
        "Semua kiosk",
        "Cyan",
      ],
      ["Wajib P2H sebelum mengoperasikan unit.", "Display Fleet", "Oranye"],
      [
        "Rapat P5M setiap pergantian shift di front masing-masing.",
        "Display Attendance",
        "Putih",
      ],
      [
        "Musim hujan: waspadai jalan licin di ramp Pit Tempudo.",
        "Semua kiosk",
        "Merah",
      ],
    ]),
  };
}

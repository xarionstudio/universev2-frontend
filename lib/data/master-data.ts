import { egiTypes } from "./units-db";

/* Master data dinamis (EGI, product, class, area, tempudo, bus, lokasi ex, running text) */
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
  | "runtext";

export const mdCats: MdCat[] = [
  "egi",
  "product",
  "eqclass",
  "area",
  "tempudo",
  "bus",
  "lokasiex",
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
    product: mk("product", [
      ["CATERPILLAR"],
      ["KOMATSU"],
      ["HITACHI"],
      ["SANY"],
      ["RENAULT"],
      ["SCANIA"],
      ["VOLVO"],
      ["TEREX"],
      ["BOMAG"],
      ["EPIROC"],
      ["CASE"],
      ["MITSUBISHI"],
      ["HINO"],
    ]),
    eqclass: mk("eqclass", [
      ["LD", "Light Dump Truck"],
      ["HD", "Heavy Dump Truck"],
      ["EX", "Excavator"],
      ["MH", "Manhaul"],
      ["WT", "Water Truck"],
      ["GD", "Grader"],
      ["DZ", "Dozer"],
      ["CM", "Compactor"],
      ["DR", "Drill"],
      ["LV", "Light Vehicle"],
      ["580B", "Backhoe Loader"],
    ]),
    area: mk("area", [
      ["Main Office", "Non-Mining"],
      ["KM 31", "Non-Mining"],
      ["Port / Stockpile", "Non-Mining"],
      ["Pit Tempudo", "Mining"],
      ["Pit Utara", "Mining"],
      ["Pit Selatan", "Mining"],
      ["Workshop", "Non-Mining"],
      ["Mess Karang Joang", "Non-Mining"],
    ]),
    tempudo: mk("tempudo", [
      ["TP-01", "KM 31", "Pickup"],
      ["TP-02", "Pit Tempudo", "Pickup & Drop"],
      ["TP-03", "Port / Stockpile", "Drop-off"],
      ["TP-04", "Mess Karang Joang", "Pickup", false],
    ]),
    bus: mk("bus", [
      ["B01", "K460 6x6", "05:30"],
      ["B02", "K460 6x6", "05:45"],
      ["B03", "P460XT", "06:00"],
      ["B04", "P460XT", "06:15", false],
    ]),
    lokasiex: mk("lokasiex", [
      ["EX7007", "B01", "TP-02"],
      ["EX6001", "B02", "TP-02"],
      ["EX5001", "B02", "TP-03"],
      ["EX2015", "B03", "TP-01"],
      ["EX3007", "B01", "TP-04"],
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

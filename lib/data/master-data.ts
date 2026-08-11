/* Master data dinamis (EGI, product, class, area, tempudo, bus, lokasi ex, mess, running text)
   Diambil dari backend API GET /api/master/:category. */
export type MdEntry = {
  id: string;
  code: string;
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

export const mdCats: MdCat[] = [
  "egi",
  "product",
  "eqclass",
  "area",
  "tempudo",
  "bus",
  "lokasiex",
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

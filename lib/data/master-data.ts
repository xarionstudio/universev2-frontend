/* Master data dinamis (EGI, product, class, area, tempudo, bus, lokasi ex, mess, running text)
   Diambil dari backend API GET /api/master/:category. */
export type MdEntry = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  // Field spesifik per kategori (opsional, sesuai kolom database)
  description?: string; // eqclass → master_eq_classes.description
  category?: string; // area → master_areas.category
  location?: string; // tempudo → master_tempudo.location
  pickupType?: string; // tempudo → master_tempudo.pickup_type
  egiType?: string; // bus → master_buses.egi_type
  departureTime?: string; // bus → master_buses.departure_time
  busCode?: string; // lokasiex → master_locations_ex.bus_code
  tempudoCode?: string; // lokasiex → master_locations_ex.tempudo_code
  block?: string; // mess → master_mess.block
  targetDisplay?: string; // runtext → master_running_texts.target_display
  textColor?: string; // runtext → master_running_texts.text_color
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

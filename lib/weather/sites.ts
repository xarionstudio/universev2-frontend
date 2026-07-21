/* Peta site/mess -> koordinat untuk fitur cuaca live.

   Lokasi cuaca TIDAK diambil dari geolocation browser: operator memakai
   perangkat kantor/mess yang IP dan GPS-nya tidak mewakili lokasi tambang,
   dan prompt izin lokasi akan muncul di setiap halaman. Sumber kebenarannya
   adalah site tempat user ditugaskan (field `mess` di data karyawan).

   KOORDINAT DI BAWAH INI PERKIRAAN — diambil dari peta area operasi
   Balikpapan / Kalimantan Timur, bukan dari survei. Cuaca Open-Meteo
   di-resolve pada grid ~1-11 km, jadi selisih beberapa ratus meter tidak
   mengubah hasil. Kalau titik mess yang sebenarnya sudah diketahui, cukup
   ubah angka lat/lon di tabel SITES ini — tidak ada file lain yang perlu
   disentuh. */

export type WeatherSite = {
  /* id stabil untuk key React & logging; jangan diubah sembarangan */
  id: string;
  /* nama kanonik site seperti dipakai di data karyawan */
  name: string;
  /* label siap tampil di kartu dashboard */
  label: string;
  /* PERKIRAAN — lihat catatan di atas */
  lat: number;
  lon: number;
  /* true HANYA bila objek ini dihasilkan oleh jalur fallback (mess kosong
     atau tidak dikenal). Entri Balikpapan di dalam SITES sendiri
     fallback:false — mencocokkan "Kantor Pusat" adalah pencocokan yang
     BENAR, bukan tebakan, dan kartu tidak boleh menuduh datanya belum
     terpetakan. */
  fallback: boolean;
  /* ejaan alternatif yang mungkin muncul di data (tanpa spasi/tanda baca) */
  aliases: string[];
};

/* Balikpapan kota — dipakai sebagai fallback saat mess kosong/tidak dikenal,
   sekaligus site yang sah untuk kantor pusat. Semua site operasi ada dalam
   radius ~60 km dari sini. */
const BALIKPAPAN: WeatherSite = {
  id: "balikpapan",
  name: "Balikpapan",
  label: "Balikpapan, Kalimantan Timur",
  lat: -1.2379,
  lon: 116.8529,
  fallback: false,
  aliases: ["balikpapan", "bpn", "kantorpusat", "headoffice"],
};

/* Objek yang dikembalikan saat TIDAK ada yang cocok. Koordinatnya sama
   dengan Balikpapan, tapi fallback:true supaya konsumen bisa membedakan
   "ini titik acuan umum" dari "ini memang site-nya". */
export const DEFAULT_SITE: WeatherSite = { ...BALIKPAPAN, fallback: true };

export const SITES: WeatherSite[] = [
  {
    id: "mess-31",
    name: "Mess 31",
    label: "Mess 31, Balikpapan",
    /* PERKIRAAN — area haul road utara Balikpapan */
    lat: -1.062,
    lon: 116.904,
    fallback: false,
    aliases: ["mess31", "m31", "site31", "messtigasatu"],
  },
  {
    id: "mess-km-12",
    name: "Mess KM 12",
    label: "Mess KM 12, Balikpapan",
    /* PERKIRAAN — koridor Km 12 Jl. Soekarno-Hatta (Balikpapan-Samarinda) */
    lat: -1.15,
    lon: 116.86,
    fallback: false,
    aliases: ["messkm12", "km12", "messkm012", "sitekm12"],
  },
  BALIKPAPAN,
];

/* Alias -> site, diurutkan dari alias terpanjang supaya "mess31" tidak
   kecolongan oleh alias yang lebih pendek saat pencocokan awalan. */
const ALIAS_INDEX: Array<{ alias: string; site: WeatherSite }> = SITES.flatMap(
  (site) => site.aliases.map((alias) => ({ alias, site }))
).sort((a, b) => b.alias.length - a.alias.length);

/* Buang semua kecuali huruf & angka, lalu lowercase.
   "Mess 31 — Blok C" -> "mess31blokc" — tahan terhadap em dash, en dash,
   hyphen, spasi ganda, dan huruf kapital yang tidak konsisten. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* Ambil bagian sebelum pemisah blok/kamar bila ada.
   "Mess KM 12 — Blok B" -> "Mess KM 12". Hyphen TANPA spasi sengaja tidak
   dipotong supaya "KM-12" tetap utuh. */
function headOf(value: string): string {
  const cut = value.split(/\s[—–|/]\s|\s-\s|,/)[0];
  return (cut ?? value).trim();
}

/* Cari site dari nilai field `mess`. null bila tidak dikenal. */
export function lookupSite(
  mess: string | null | undefined
): WeatherSite | null {
  if (typeof mess !== "string") return null;
  const raw = mess.trim();
  if (raw === "") return null;

  const head = normalize(headOf(raw));
  const full = normalize(raw);
  if (head === "" && full === "") return null;

  /* 1. cocok persis pada bagian kepala — kasus normal & paling murah */
  for (const { alias, site } of ALIAS_INDEX) {
    if (head === alias) return site;
  }
  /* 2. awalan pada string penuh — "Mess31BlokC" tanpa pemisah dikenal */
  for (const { alias, site } of ALIAS_INDEX) {
    if (full.startsWith(alias)) return site;
  }
  /* 3. terkandung di mana pun — jaring terakhir, mis. "Blok C Mess 31" */
  for (const { alias, site } of ALIAS_INDEX) {
    if (full.includes(alias)) return site;
  }
  return null;
}

/* Versi yang selalu memberi jawaban. Hanya jalur INI yang menghasilkan
   fallback:true. */
export function siteOfMess(mess: string | null | undefined): WeatherSite {
  return lookupSite(mess) ?? DEFAULT_SITE;
}

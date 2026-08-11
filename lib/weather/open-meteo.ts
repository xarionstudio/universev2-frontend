/* Klien Open-Meteo — dipanggil langsung dari browser, tanpa API key.

   Kenapa langsung dari browser: tidak ada rahasia yang perlu disembunyikan,
   dan menaruhnya di server justru membuat satu IP menanggung seluruh trafik
   semua operator.

   File ini murni fungsi — tidak ada state, tidak menyentuh window/document,
   jadi aman diimpor di server component sekalipun. */

import type { Dict } from "@/lib/i18n/id";

const ENDPOINT =
  process.env.NEXT_PUBLIC_WEATHER_OPEN_METEO_URL ||
  "https://api.open-meteo.com/v1/forecast";

/* ------------------------------------------------------------------ *
 * Tipe publik
 * ------------------------------------------------------------------ */

/* Kosakata EFEK VISUAL, bukan kosakata meteorologi.
   - "sun"     cerah. `isDay` menentukan varian render (langit bersih vs
               bulan + bintang), bukan kind terpisah.
   - "cloud"   berawan sampai mendung. Juga menampung kode SALJU (71-77,
               85-86): Balikpapan tidak pernah bersalju.
   - "rain"    gerimis/hujan/hujan lokal. Bedanya kekuatan -> `intensity`.
   - "storm"   petir. Dipisah karena secara operasional petir adalah sinyal
               stop work; sinyalnya disampaikan di KARTU (chip danger +
               teks), BUKAN lewat kilatan layar.
   - "fog"     kabut/asap — kondisi nyata di Kalimantan, efeknya statis.
   - "unknown" netral: belum ada data, gagal ambil, atau kode di luar tabel.
               Lapisan efek menggambar NOL elemen untuk kind ini. */
export type WeatherKind =
  "sun" | "cloud" | "rain" | "storm" | "fog" | "unknown";

export type WeatherIntensity = "none" | "light" | "moderate" | "heavy";

/* Kunci i18n untuk label kondisi — PERSIS kunci `wxc*` di lib/i18n. */
export type WeatherLabelKey =
  | "wxcClear"
  | "wxcMainlyClear"
  | "wxcPartly"
  | "wxcOvercast"
  | "wxcFog"
  | "wxcDrizzle"
  | "wxcRain"
  | "wxcHeavyRain"
  | "wxcShowers"
  | "wxcSnow"
  | "wxcThunder"
  | "wxcUnknown";

/* Penjaga kompilasi: kunci yang hilang dari kamus = gagal build, bukan
   teks kosong di layar. `import type` terhapus saat build. */
type Assert<T extends true> = T;
export type LabelKeysExistInDict = Assert<
  WeatherLabelKey extends keyof Dict ? true : false
>;

export type Weather = {
  kind: WeatherKind;
  intensity: WeatherIntensity;
  /* kode WMO mentah — untuk debugging */
  code: number;
  labelKey: WeatherLabelKey;
  /* SEMUA besaran fisik boleh null.
     Nol adalah pengukuran yang sah (curah hujan 0 mm itu normal), jadi nol
     TIDAK boleh dipakai sebagai penanda "tidak ada data" — kartu akan
     menampilkan 0°C di Balikpapan dengan stempel jam yang segar dan tidak
     ada cara membedakannya dari pengukuran asli. Field yang hilang -> null,
     dan kartu merender em dash. Lapisan efek tidak butuh angka sama sekali,
     hanya `kind`, jadi ini tidak mengurangi apa pun secara visual. */
  tempC: number | null;
  feelsLikeC: number | null;
  humidityPct: number | null;
  windKph: number | null;
  precipMm: number | null;
  isDay: boolean;
  /* Waktu OBSERVASI dalam epoch ms UTC yang tidak ambigu, dihitung dari
     `current.time` (lokal-naif, tanpa offset) + `utc_offset_seconds` yang
     dikirim di respons yang sama. null bila salah satunya tidak ada.
     JANGAN simpan string lokal-naif: `new Date(str)` akan menafsirkannya
     ulang memakai timezone perangkat. */
  observedAtMs: number | null;
  /* epoch ms saat respons diterima — hanya untuk cek basi di provider */
  fetchedAt: number;
};

/* ------------------------------------------------------------------ *
 * Pemetaan kode WMO
 * ------------------------------------------------------------------ */

type CodeInfo = {
  kind: WeatherKind;
  intensity: WeatherIntensity;
  labelKey: WeatherLabelKey;
};

const CODES: Record<number, CodeInfo> = {
  0: { kind: "sun", intensity: "none", labelKey: "wxcClear" },
  1: { kind: "sun", intensity: "none", labelKey: "wxcMainlyClear" },
  2: { kind: "cloud", intensity: "light", labelKey: "wxcPartly" },
  3: { kind: "cloud", intensity: "moderate", labelKey: "wxcOvercast" },
  45: { kind: "fog", intensity: "moderate", labelKey: "wxcFog" },
  48: { kind: "fog", intensity: "heavy", labelKey: "wxcFog" },
  51: { kind: "rain", intensity: "light", labelKey: "wxcDrizzle" },
  53: { kind: "rain", intensity: "light", labelKey: "wxcDrizzle" },
  55: { kind: "rain", intensity: "moderate", labelKey: "wxcDrizzle" },
  56: { kind: "rain", intensity: "light", labelKey: "wxcRain" },
  57: { kind: "rain", intensity: "moderate", labelKey: "wxcRain" },
  61: { kind: "rain", intensity: "light", labelKey: "wxcRain" },
  63: { kind: "rain", intensity: "moderate", labelKey: "wxcRain" },
  65: { kind: "rain", intensity: "heavy", labelKey: "wxcHeavyRain" },
  66: { kind: "rain", intensity: "moderate", labelKey: "wxcRain" },
  67: { kind: "rain", intensity: "heavy", labelKey: "wxcHeavyRain" },
  /* salju -> mendung; lihat catatan di WeatherKind */
  71: { kind: "cloud", intensity: "moderate", labelKey: "wxcSnow" },
  73: { kind: "cloud", intensity: "moderate", labelKey: "wxcSnow" },
  75: { kind: "cloud", intensity: "heavy", labelKey: "wxcSnow" },
  77: { kind: "cloud", intensity: "moderate", labelKey: "wxcSnow" },
  80: { kind: "rain", intensity: "light", labelKey: "wxcShowers" },
  81: { kind: "rain", intensity: "moderate", labelKey: "wxcShowers" },
  82: { kind: "rain", intensity: "heavy", labelKey: "wxcShowers" },
  85: { kind: "cloud", intensity: "moderate", labelKey: "wxcSnow" },
  86: { kind: "cloud", intensity: "heavy", labelKey: "wxcSnow" },
  95: { kind: "storm", intensity: "moderate", labelKey: "wxcThunder" },
  96: { kind: "storm", intensity: "heavy", labelKey: "wxcThunder" },
  99: { kind: "storm", intensity: "heavy", labelKey: "wxcThunder" },
};

const UNKNOWN_CODE: CodeInfo = {
  kind: "unknown",
  intensity: "none",
  labelKey: "wxcUnknown",
};

export function describeCode(code: number): CodeInfo {
  return CODES[code] ?? UNKNOWN_CODE;
}

export function kindOfCode(code: number): WeatherKind {
  return describeCode(code).kind;
}

/* Kode WMO melaporkan KATEGORI, bukan derasnya. Curah hujan aktual dipakai
   untuk MENAIKKAN (tidak pernah menurunkan) intensitas. Ambang BMKG:
   >=10 mm/jam lebat, >=5 mm/jam sedang. */
function refineIntensity(
  base: WeatherIntensity,
  kind: WeatherKind,
  precipMm: number | null
): WeatherIntensity {
  if (kind !== "rain" && kind !== "storm") return base;
  if (precipMm === null) return base;
  const rank: WeatherIntensity[] = ["none", "light", "moderate", "heavy"];
  const bumped: WeatherIntensity =
    precipMm >= 10 ? "heavy" : precipMm >= 5 ? "moderate" : base;
  return rank.indexOf(bumped) > rank.indexOf(base) ? bumped : base;
}

/* ------------------------------------------------------------------ *
 * Parsing respons (JSON tidak dipercaya)
 * ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/* Angka yang benar-benar angka; selain itu null (BUKAN 0) */
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp(v: number | null, lo: number, hi: number): number | null {
  return v === null ? null : Math.min(hi, Math.max(lo, v));
}

/* "2026-07-20T15:00" (lokal-naif) + offset detik -> epoch ms UTC. */
function observedEpoch(time: unknown, offsetSec: unknown): number | null {
  if (typeof time !== "string" || time === "") return null;
  const off = numOrNull(offsetSec);
  if (off === null) return null;
  const asUtc = Date.parse(`${time}Z`);
  if (!Number.isFinite(asUtc)) return null;
  return asUtc - off * 1000;
}

export class WeatherFetchError extends Error {
  readonly reason: "timeout" | "network" | "bad-response";
  constructor(reason: "timeout" | "network" | "bad-response", message: string) {
    super(message);
    this.name = "WeatherFetchError";
    this.reason = reason;
  }
}

/* ------------------------------------------------------------------ *
 * fetchWeather
 * ------------------------------------------------------------------ */

/* Koordinat dibulatkan 4 desimal (~11 m): presisi lebih tinggi tidak
   menambah informasi (grid model kilometer) tapi membuat URL stabil
   sehingga cache CDN/browser bisa kena. */
export function weatherUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "is_day",
    ].join(","),
    timezone: "auto",
  });
  return `${ENDPOINT}?${q.toString()}`;
}

/* MELEMPAR WeatherFetchError bila gagal — provider yang menelannya. */
export async function fetchWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<Weather> {
  let res: Response;
  try {
    res = await fetch(weatherUrl(lat, lon), {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    /* DOMException tidak selalu turunan Error di semua engine, jadi nama-nya
       dibaca lewat guard objek biasa, bukan `instanceof`. */
    const aborted =
      signal?.aborted === true ||
      (isRecord(err) &&
        typeof err.name === "string" &&
        err.name === "AbortError");
    throw new WeatherFetchError(
      aborted ? "timeout" : "network",
      aborted ? "permintaan cuaca dibatalkan" : "jaringan tidak tersedia"
    );
  }

  if (!res.ok) {
    throw new WeatherFetchError("bad-response", `HTTP ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new WeatherFetchError("bad-response", "respons bukan JSON");
  }

  if (!isRecord(body) || !isRecord(body.current)) {
    throw new WeatherFetchError("bad-response", "blok current tidak ada");
  }

  const c = body.current;
  /* weather_code satu-satunya field WAJIB: tanpa itu tidak ada yang bisa
     dirender. Sisanya boleh hilang dan jadi null. */
  if (typeof c.weather_code !== "number" || !Number.isFinite(c.weather_code)) {
    throw new WeatherFetchError("bad-response", "weather_code tidak valid");
  }

  const code = Math.trunc(c.weather_code);
  const info = describeCode(code);
  const tempC = numOrNull(c.temperature_2m);
  const rawPrecip = numOrNull(c.precipitation);
  const precipMm = rawPrecip === null ? null : Math.max(0, rawPrecip);
  const rawWind = numOrNull(c.wind_speed_10m);
  const isDayNum = numOrNull(c.is_day);

  return {
    kind: info.kind,
    intensity: refineIntensity(info.intensity, info.kind, precipMm),
    code,
    labelKey: info.labelKey,
    tempC,
    /* apparent_temperature kadang tidak dikirim untuk titik tertentu —
       jatuh ke suhu sebenarnya (yang sendirinya boleh null) */
    feelsLikeC: numOrNull(c.apparent_temperature) ?? tempC,
    humidityPct: clamp(numOrNull(c.relative_humidity_2m), 0, 100),
    windKph: rawWind === null ? null : Math.max(0, rawWind),
    precipMm,
    /* is_day dikirim sebagai 1/0. Tidak ada nilai -> anggap siang; ini
       hanya memilih varian render, bukan angka yang ditampilkan. */
    isDay: isDayNum === null ? true : isDayNum === 1,
    observedAtMs: observedEpoch(c.time, body.utc_offset_seconds),
    fetchedAt: Date.now(),
  };
}

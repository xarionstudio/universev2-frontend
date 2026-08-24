/* Resolusi lokasi untuk cuaca — GPS dulu, lalu IP, terakhir koordinat site.

   Perubahan dari versi sebelumnya (yang memakai site/mess sebagai sumber):
   sekarang lokasi diambil dari POSISI NYATA pengguna saat ini, sesuai
   permintaan "real-time by lokasi IP atau lokasi maps saat ini".

   Urutan:
     1. GPS browser (navigator.geolocation) — "lokasi maps saat ini". Butuh
        izin sekali dan HTTPS (atau localhost). Kalau ditolak/timeout, langsung
        jatuh ke IP tanpa menghalangi apa pun.
     2. IP geolocation (ipapi.co lalu ipwho.is) — tanpa API key, CORS ok. Ini
        jalur "lokasi IP".
     3. Koordinat site milik user (dari mess) sebagai jaring terakhir, supaya
        kalau GPS ditolak DAN IP terblokir (VSAT site), tetap ada titik acuan.

   KONTRAK DEGRADASI DIAM-DIAM: tidak ada satu pun jalur di sini yang boleh
   melempar keluar atau menulis ke console. Setiap kegagalan mengembalikan
   null dan pindah ke kandidat berikutnya. Semua request menghormati AbortSignal
   dan punya timeout sendiri. Aman untuk SSR: navigator/fetch hanya disentuh
   saat fungsi dipanggil (dari dalam effect klien), bukan di module scope. */

export type LocationSource = "gps" | "ip" | "fallback";

export type ResolvedLocation = {
  lat: number;
  lon: number;
  /* nama tempat PALING SPESIFIK yang tersedia (desa/kelurahan bila ada);
     null → pemanggil pakai label generik */
  label: string | null;
  /* satu tingkat di atasnya (kabupaten/kota) sebagai konteks; boleh null.
     Dipisah dari `label` supaya kartu bisa memberi bobot berbeda pada
     keduanya, bukan menyambung jadi satu kalimat panjang. */
  area: string | null;
  source: LocationSource;
};

const GPS_TIMEOUT_MS = 8000;
const HTTP_TIMEOUT_MS = 6000;
/* posisi boleh dipakai ulang sampai 2 menit — cukup segar untuk akurasi
   desa tanpa membebani baterai dengan prompt GPS berulang. */
const GPS_MAX_AGE_MS = 2 * 60 * 1000;

/* User-Agent wajib menurut kebijakan Nominatim; tanpa ini permintaan
   sering ditolak dan kartu jatuh ke penyedia cadangan yang hanya mengenal
   tingkat kecamatan (mis. "Kaubun" alih-alih "Bumi Etam"). */
const NOMINATIM_UA =
  "UniverseWeather/1.0 (dashboard; contact: admin@universe.local)";

/* ---- validasi runtime: jangan percaya bentuk JSON dari luar ---- */
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/* fetch JSON dengan timeout sendiri + hormat AbortSignal luar. Tidak pernah
   melempar: gagal apa pun -> null. */
async function fetchJson(
  url: string,
  signal: AbortSignal | undefined
): Promise<unknown> {
  const ac = new AbortController();
  const killer = setTimeout(() => ac.abort(), HTTP_TIMEOUT_MS);
  const onAbort = () => ac.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(killer);
      return null;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: {
        accept: "application/json",
        ...(url.includes("nominatim.openstreetmap.org")
          ? { "User-Agent": NOMINATIM_UA }
          : {}),
      },
    });
    if (!r.ok) return null;
    return (await r.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(killer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/* ---- 1. GPS ---- */
function tryGps(
  signal: AbortSignal | undefined,
  forceFresh = false
): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: { lat: number; lon: number } | null) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve(v);
    };
    const onAbort = () => finish(null);
    if (signal) {
      if (signal.aborted) return finish(null);
      signal.addEventListener("abort", onAbort, { once: true });
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = num(pos.coords.latitude);
          const lon = num(pos.coords.longitude);
          finish(lat !== null && lon !== null ? { lat, lon } : null);
        },
        /* ditolak / tidak tersedia / timeout — semua jadi null tanpa suara */
        () => finish(null),
        {
          enableHighAccuracy: true,
          timeout: GPS_TIMEOUT_MS,
          maximumAge: forceFresh ? 0 : GPS_MAX_AGE_MS,
        }
      );
    } catch {
      finish(null);
    }
  });
}

/* ---- Reverse geocode: dua penyedia, yang paling presisi lebih dulu ----

   Kenapa dua. BigDataCloud (dipakai sendirian di versi sebelumnya) tidak punya
   data setingkat desa untuk Indonesia: di Kutai Timur, tingkat administratif
   terdalam yang ia kenal berhenti di kabupaten, dan `city`/`locality`-nya
   mengembalikan nama KECAMATAN. Itulah sebabnya kartu menulis "Kaubun"
   sementara pengguna sebenarnya berada di desa Bumi Etam — sama-sama benar
   secara wilayah, tapi bukan penanda lokasi yang dijanjikan.

   Nominatim (OpenStreetMap) punya batas desa untuk Indonesia dan
   mengembalikan `village: "Bumi Etam"` di koordinat yang sama. Ia dipakai
   lebih dulu, BigDataCloud tetap disimpan sebagai jaring pengaman karena
   Nominatim membatasi laju permintaan.

   Soal batas laju: kebijakan Nominatim adalah maksimum 1 permintaan/detik dan
   pemakaian yang wajar. Fungsi ini hanya terpanggil saat lokasi diselesaikan
   — sekali per pemasangan shell dan saat operator menekan refresh — bukan per
   siklus polling cuaca (15 menit). */

type GeoName = { label: string | null; area: string | null };

const EMPTY_NAME: GeoName = { label: null, area: null };

/* Buang awalan administratif yang membuat baris lokasi terasa kaku. */
function cleanAdminName(value: string | null): string | null {
  if (!value) return null;
  return (
    value
      .replace(/^(Kabupaten|Kota|Kecamatan|Desa|Kelurahan)\s+/i, "")
      .trim() || null
  );
}

/* Susun label (desa/kelurahan) dan area (kecamatan/kabupaten) dari objek
   address Nominatim/OSM. Urutan field mengikuti hierarki administratif
   Indonesia: desa -> kecamatan -> kabupaten. */
function namesFromAddress(o: Record<string, unknown>): GeoName {
  const village =
    str(o.village) ?? str(o.hamlet) ?? str(o.neighbourhood) ?? str(o.quarter);
  const district =
    str(o.suburb) ??
    str(o.city_district) ??
    str(o.town) ??
    str(o.city) ??
    str(o.municipality);
  const regency =
    cleanAdminName(str(o.county)) ?? cleanAdminName(str(o.state_district));

  const label = village ?? district;
  let area: string | null = null;
  if (village && district && district !== village) {
    area = cleanAdminName(district);
  } else if (district && regency && regency !== district) {
    area = regency;
  } else if (village && regency && regency !== village) {
    area = regency;
  } else if (!village && regency) {
    area = regency;
  }

  return label ? { label: cleanAdminName(label) ?? label, area } : EMPTY_NAME;
}

/* Nominatim — punya tingkat desa/kelurahan.
   zoom=14 meminta ketelitian setingkat desa/suburb; lebih dalam dari itu
   jawabannya mulai berisi nama jalan, yang bukan penanda lokasi yang berguna
   di area tambang. */
async function reverseNominatim(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined
): Promise<GeoName | null> {
  const url =
    "https://nominatim.openstreetmap.org/reverse" +
    `?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}` +
    "&format=jsonv2&zoom=14&accept-language=id";
  const j = await fetchJson(url, signal);
  if (!j || typeof j !== "object") return null;
  const a = (j as Record<string, unknown>).address;
  if (!a || typeof a !== "object") return null;
  return namesFromAddress(a as Record<string, unknown>);
}

/* Photon (Komoot) — cadangan OSM dengan data desa Indonesia, tanpa key. */
async function reversePhoton(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined
): Promise<GeoName | null> {
  const url =
    "https://photon.komoot.io/reverse" +
    `?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}` +
    "&lang=id";
  const j = await fetchJson(url, signal);
  if (!j || typeof j !== "object") return null;
  const features = (j as Record<string, unknown>).features;
  if (!Array.isArray(features) || features.length === 0) return null;
  const props = (features[0] as Record<string, unknown> | undefined)
    ?.properties;
  if (!props || typeof props !== "object") return null;
  const p = props as Record<string, unknown>;
  const village = str(p.name);
  const district = str(p.district) ?? str(p.city) ?? str(p.county);
  const regency = cleanAdminName(str(p.state));
  const type = str(p.type);
  if (type === "house" || type === "street") {
    return district
      ? { label: cleanAdminName(district), area: regency }
      : EMPTY_NAME;
  }
  const label = village ?? district;
  let area: string | null = null;
  if (village && district && district !== village) {
    area = cleanAdminName(district);
  } else if (regency && regency !== label) {
    area = regency;
  }
  return label ? { label: cleanAdminName(label) ?? label, area } : null;
}

/* BigDataCloud — cadangan; tanpa key, CORS ok, tanpa batas laju ketat. */
async function reverseBigDataCloud(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined
): Promise<GeoName | null> {
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=id`;
  const j = await fetchJson(url, signal);
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const label = str(o.locality) ?? str(o.city);
  /* tingkat administratif terdalam yang dikenal (mis. "Kutai Timur") */
  let area: string | null = null;
  const adm = (o.localityInfo as Record<string, unknown> | undefined)
    ?.administrative;
  if (Array.isArray(adm)) {
    let best = -1;
    for (const row of adm) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const lvl = num(r.adminLevel);
      const name = str(r.name);
      if (lvl !== null && name && lvl > best && name !== label) {
        best = lvl;
        area = name;
      }
    }
  }
  return label ? { label, area: area ?? str(o.principalSubdivision) } : null;
}

async function reverseGeocode(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined
): Promise<GeoName> {
  /* Nominatim dicoba DUA kali sebelum menyerah ke penyedia kasar. Ia menolak
     permintaan yang dianggap tidak teridentifikasi atau terlalu rapat
     ("Access denied") — penolakan sesaat seperti itu tidak bisa dibedakan dari
     "tidak ada data" oleh pemanggil, dan akibatnya kartu diam-diam turun ke
     nama KECAMATAN padahal desanya sebenarnya tersedia. Satu percobaan ulang
     berjarak menutup sebagian besar kasus itu tanpa melanggar batas laju. */
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) break;
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1100));
      if (signal?.aborted) break;
    }
    const got = await reverseNominatim(lat, lon, signal);
    if (got) return got;
  }
  if (!signal?.aborted) {
    const photon = await reversePhoton(lat, lon, signal);
    if (photon) return photon;
  }
  if (!signal?.aborted) {
    const got = await reverseBigDataCloud(lat, lon, signal);
    if (got) return got;
  }
  return EMPTY_NAME;
}

/* ---- 2. IP ---- */
async function fromIpapi(
  signal: AbortSignal | undefined
): Promise<ResolvedLocation | null> {
  const j = await fetchJson("https://ipapi.co/json/", signal);
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (o.error) return null; // mis. rate limited
  const lat = num(o.latitude);
  const lon = num(o.longitude);
  if (lat === null || lon === null) return null;
  return {
    lat,
    lon,
    label: str(o.city) ?? str(o.region),
    area: str(o.region),
    source: "ip",
  };
}

async function fromIpwho(
  signal: AbortSignal | undefined
): Promise<ResolvedLocation | null> {
  const j = await fetchJson("https://ipwho.is/", signal);
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (o.success !== true) return null;
  const lat = num(o.latitude);
  const lon = num(o.longitude);
  if (lat === null || lon === null) return null;
  return {
    lat,
    lon,
    label: str(o.city) ?? str(o.region),
    area: str(o.region),
    source: "ip",
  };
}

/* ---- resolusi utama ---- */
export async function resolveLocation(opts: {
  fallback: { lat: number; lon: number; label: string };
  signal?: AbortSignal;
  forceFreshGps?: boolean;
}): Promise<ResolvedLocation> {
  const { fallback, signal, forceFreshGps = false } = opts;

  /* 1. GPS — lokasi maps saat ini */
  const gps = await tryGps(signal, forceFreshGps);
  if (gps) {
    const name = await reverseGeocode(gps.lat, gps.lon, signal);
    return {
      lat: gps.lat,
      lon: gps.lon,
      label: name.label,
      area: name.area,
      source: "gps",
    };
  }

  /* 2. IP — dua penyedia berurutan. Koordinat dari IP tingkat kota, tapi
     namanya tetap dilewatkan reverse geocode: penyedia IP mengembalikan nama
     kota besar terdekat, sementara reverse geocode di koordinat yang sama
     memberi wilayah yang sebenarnya. */
  for (const provider of [fromIpapi, fromIpwho]) {
    if (signal?.aborted) break;
    const got = await provider(signal);
    if (!got) continue;
    const name = await reverseGeocode(got.lat, got.lon, signal);
    return {
      ...got,
      label: name.label ?? got.label,
      area: name.area ?? got.area,
    };
  }

  /* 3. koordinat site (jaring terakhir) */
  return {
    lat: fallback.lat,
    lon: fallback.lon,
    label: fallback.label,
    area: null,
    source: "fallback",
  };
}

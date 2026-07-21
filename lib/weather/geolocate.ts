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
  /* nama kota/wilayah siap tampil; null → pemanggil pakai label generik */
  label: string | null;
  source: LocationSource;
};

const GPS_TIMEOUT_MS = 6000;
const HTTP_TIMEOUT_MS = 6000;
/* posisi boleh dipakai ulang sampai 10 menit — di meja kerja tidak berpindah,
   dan ini menghindari prompt/penguncian GPS berulang. */
const GPS_MAX_AGE_MS = 10 * 60 * 1000;

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
      headers: { accept: "application/json" },
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
  signal: AbortSignal | undefined
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
          enableHighAccuracy: false,
          timeout: GPS_TIMEOUT_MS,
          maximumAge: GPS_MAX_AGE_MS,
        }
      );
    } catch {
      finish(null);
    }
  });
}

/* Reverse geocode untuk GPS: BigDataCloud client endpoint, tanpa key, CORS ok.
   Best-effort — kalau gagal, label null dan pemanggil pakai teks generik. */
async function reverseGeocode(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined
): Promise<string | null> {
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=id`;
  const j = await fetchJson(url, signal);
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  return str(o.city) ?? str(o.locality) ?? str(o.principalSubdivision);
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
  return { lat, lon, label: str(o.city) ?? str(o.region), source: "ip" };
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
  return { lat, lon, label: str(o.city) ?? str(o.region), source: "ip" };
}

/* ---- resolusi utama ---- */
export async function resolveLocation(opts: {
  fallback: { lat: number; lon: number; label: string };
  signal?: AbortSignal;
}): Promise<ResolvedLocation> {
  const { fallback, signal } = opts;

  /* 1. GPS — lokasi maps saat ini */
  const gps = await tryGps(signal);
  if (gps) {
    const label = await reverseGeocode(gps.lat, gps.lon, signal);
    return { lat: gps.lat, lon: gps.lon, label, source: "gps" };
  }

  /* 2. IP — dua penyedia berurutan */
  for (const provider of [fromIpapi, fromIpwho]) {
    if (signal?.aborted) break;
    const got = await provider(signal);
    if (got) return got;
  }

  /* 3. koordinat site (jaring terakhir) */
  return {
    lat: fallback.lat,
    lon: fallback.lon,
    label: fallback.label,
    source: "fallback",
  };
}

"use client";

import * as React from "react";

import {
  getWeatherEffectsServerSnapshot,
  getWeatherEffectsSnapshot,
  setWeatherEffectsEnabled,
  subscribeWeatherEffects,
} from "@/lib/weather/effects-pref";
import { resolveLocation, type LocationSource } from "@/lib/weather/geolocate";
import {
  fetchWeather,
  WeatherFetchError,
  type Weather,
  type WeatherIntensity,
  type WeatherKind,
} from "@/lib/weather/open-meteo";
import { DEFAULT_SITE, siteOfMess } from "@/lib/weather/sites";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";

/* Sumber tunggal data cuaca untuk shell admin.

   Dipasang SEKALI di app/(app)/layout.tsx (di dalam RefreshProvider):
   lapisan efek latar dan kartu dashboard membaca context yang sama, jadi
   hanya ada satu loop polling per tab. Layar kiosk/TV di luar grup (app)
   tidak memasang provider ini dan karena itu tidak terpengaruh sama sekali;
   halaman /login juga tidak, karena root providers TIDAK menyentuh cuaca.

   Provider dipasang SETELAH guard `if (!hydrated || !ready) return null` di
   layout, sehingga usePermissions().user sudah terisi pada mount pertama dan
   `site` tidak pernah loncat DEFAULT_SITE -> Mess 31 (yang akan memicu
   fetch kedua yang sia-sia). */

export type WeatherErrorReason = "timeout" | "network" | "bad-response";

/* Deskriptor scene: SATU objek berisi ketiga field yang menentukan tampilan.
   Sengaja tidak memecah `kind` ke atas dan menyembunyikan `intensity`/`isDay`
   di dalam `data` — pemanggil yang menulis <WeatherScene kind={kind} /> akan
   diam-diam merender gerimis dengan kepadatan hujan sedang dan malam dengan
   kecerahan siang. Dengan satu objek, kabel yang benar adalah kabel
   terpendek. */
export type WeatherSceneState = {
  kind: WeatherKind;
  intensity: WeatherIntensity;
  isDay: boolean;
};

export type WeatherContextValue = {
  /* "unknown" selama belum ada data, saat gagal total, dan saat kode WMO
     tidak dikenali. Lapisan efek menggambar NOL elemen untuk "unknown". */
  scene: WeatherSceneState;
  /* null sampai fetch pertama berhasil. Data LAMA dipertahankan saat
     refresh gagal — cuaca 15 menit lalu lebih berguna daripada kartu
     kosong, dan tidak ada yang berkedip di layar operator. */
  data: Weather | null;
  /* Nama lokasi siap tampil — tempat PALING SPESIFIK hasil GPS/IP (desa bila
     tersedia), atau nama site saat jatuh ke fallback. String kosong sebelum
     lokasi terselesaikan. */
  locationLabel: string;
  /* Wilayah satu tingkat di atasnya (kabupaten/kota); string kosong bila tidak
     diketahui. Dipisah supaya kartu bisa menampilkannya dengan bobot berbeda,
     bukan menyambungnya jadi satu baris panjang. */
  locationArea: string;
  /* Koordinat yang BENAR-BENAR dipakai untuk mengambil cuaca. Ditampilkan di
     kartu karena nama tempat hasil geocoder bisa meleset satu tingkat
     administratif tanpa ketahuan, sementara koordinat bisa langsung dicocokkan
     operator dengan peta. null sebelum lokasi terselesaikan. */
  lat: number | null;
  lon: number | null;
  /* Dari mana lokasi didapat:
       "gps"      = presisi (izin diberikan)
       "ip"       = perkiraan tingkat kota
       "fallback" = koordinat site (GPS ditolak & IP gagal) */
  locationSource: LocationSource;
  /* true HANYA sampai percobaan pertama selesai. Refresh berikutnya berjalan
     diam-diam — shell yang selalu terbuka tidak boleh menampilkan skeleton
     tiap 15 menit. */
  loading: boolean;
  /* null bila percobaan terakhir berhasil. Untuk diagnosa, BUKAN untuk
     ditampilkan ke operator — tidak ada toast, tidak ada banner. */
  error: WeatherErrorReason | null;
  /* Jam acuan untuk menghitung usia data, DIAMBIL SAAT provider menyetel
     state (di dalam callback async), bukan saat render. Membaca Date.now()
     ketika merender melanggar aturan kemurnian React — hasilnya berubah tiap
     kali komponen kebetulan dirender ulang. Konsekuensinya: tingkat
     "segar/basi" berpindah saat provider memperbarui diri (≤ 15 menit),
     yang memang presisi yang dijanjikan fitur ini. */
  nowMs: number;
};

/* ------------------------------------------------------------------ *
 * Tetapan waktu
 * ------------------------------------------------------------------ */

/* Blok `current` Open-Meteo di hulu diperbarui tiap ~15 menit; polling lebih
   cepat hanya membakar kuota tanpa data baru. */
export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/* Interval penyegaran lokasi — GPS bisa berubah saat operator pindah site
   atau memberi izin lokasi setelah tab sudah terbuka. */
export const LOCATION_REFRESH_MS = 30 * 60 * 1000;

/* Jitter ±10%: saat pergantian shift puluhan orang membuka aplikasi dalam
   menit yang sama; tanpa jitter mereka menembak API serempak selamanya. */
const JITTER = 0.1;

/* VSAT/4G di site sering lambat tapi jarang mati total. */
const TIMEOUT_MS = 8000;

/* Backoff: 30s, 1m, 2m, 4m, 8m, lalu mentok di periode refresh. */
const BACKOFF_BASE_MS = 30 * 1000;

/* Tab tersembunyi: nol permintaan, hanya intip berkala kalau event
   visibilitychange terlewat. */
const HIDDEN_RECHECK_MS = 60 * 1000;

/* Data dianggap basi setelah 1,5x periode. */
const STALE_MS = WEATHER_REFRESH_MS * 1.5;

function withJitter(ms: number): number {
  return Math.round(ms * (1 - JITTER + Math.random() * JITTER * 2));
}

function backoffMs(failures: number): number {
  const raw = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, failures - 1));
  return withJitter(Math.min(raw, WEATHER_REFRESH_MS));
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

const IDLE_SCENE: WeatherSceneState = {
  kind: "unknown",
  intensity: "none",
  isDay: true,
};

/* Default aman untuk komponen yang kebetulan dirender di luar provider.
   Sengaja TIDAK melempar seperti useSession: hook ini dipanggil dari lapisan
   latar di belakang setiap halaman, dan throw di sana menjatuhkan seluruh
   layar demi hiasan. Supaya bug pemasangan tidak menyamar jadi "jaringan
   site lagi jelek", ketiadaan provider diteriakkan SEKALI di dev saja. */
const FALLBACK: WeatherContextValue = {
  scene: IDLE_SCENE,
  data: null,
  locationLabel: "",
  locationArea: "",
  lat: null,
  lon: null,
  locationSource: "fallback",
  loading: false,
  error: null,
  nowMs: 0,
};

const WeatherCtx = React.createContext<WeatherContextValue | null>(null);

type State = {
  data: Weather | null;
  error: WeatherErrorReason | null;
  loading: boolean;
  /* jam acuan usia data — di-stempel saat setState, bukan saat render */
  nowMs: number;
};

const INITIAL: State = { data: null, error: null, loading: true, nowMs: 0 };

/* Lokasi terselesaikan: null selama masih dideteksi (GPS/IP). Card menampilkan
   skeleton selama ini. */
type LocState = {
  lat: number;
  lon: number;
  label: string;
  area: string;
  source: LocationSource;
};

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePermissions();
  const { empAll } = useAppStore();
  const [state, setState] = React.useState<State>(INITIAL);
  const [loc, setLoc] = React.useState<LocState | null>(null);

  /* Site milik user (dari mess) — TIDAK lagi jadi sumber utama, hanya jaring
     terakhir bila GPS ditolak DAN IP gagal. Murni, lat/lon stabil. */
  const fallbackSite = React.useMemo(() => {
    const nik = user?.nik;
    if (!nik) return DEFAULT_SITE;
    try {
      const emp = empAll().find((e) => e.nik === nik);
      return siteOfMess(emp?.mess);
    } catch {
      return DEFAULT_SITE;
    }
  }, [user?.nik, empAll]);

  /* Resolusi lokasi: GPS -> IP -> koordinat site. Diulang saat tab kembali
     terlihat dan setiap LOCATION_REFRESH_MS supaya posisi tetap akurat. */
  const fbLat = fallbackSite.lat;
  const fbLon = fallbackSite.lon;
  const fbLabel = fallbackSite.label;
  React.useEffect(() => {
    let alive = true;

    const run = (forceFreshGps = false) => {
      const ac = new AbortController();
      void resolveLocation({
        fallback: { lat: fbLat, lon: fbLon, label: fbLabel },
        signal: ac.signal,
        forceFreshGps,
      }).then((r) => {
        if (!alive) return;
        setLoc((prev) => {
          const next = {
            lat: r.lat,
            lon: r.lon,
            label: r.label ?? fbLabel,
            area: r.area ?? "",
            source: r.source,
          };
          /* Hindari re-fetch cuaca bila koordinat hampir tidak berubah. */
          if (
            prev &&
            prev.source === next.source &&
            Math.abs(prev.lat - next.lat) < 0.0005 &&
            Math.abs(prev.lon - next.lon) < 0.0005 &&
            prev.label === next.label &&
            prev.area === next.area
          ) {
            return prev;
          }
          return next;
        });
      });
      return ac;
    };

    let active = run(false);
    const timer = setInterval(() => {
      active.abort();
      active = run(true);
    }, LOCATION_REFRESH_MS);

    const onVisibility = () => {
      if (!alive || document.visibilityState !== "visible") return;
      active.abort();
      active = run(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      active.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fbLat, fbLon, fbLabel]);

  const lat = loc?.lat ?? null;
  const lon = loc?.lon ?? null;

  /* Bergantung HANYA pada lat/lon (primitif) yang sudah terselesaikan.
     Selama lokasi belum ada (null), effect tidak berbuat apa-apa dan state
     tetap loading — card menampilkan skeleton. */
  React.useEffect(() => {
    if (lat === null || lon === null) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let failures = 0;
    let lastOkAt = 0;
    /* Kapan permintaan TERAKHIR benar-benar ditembak (berhasil atau gagal)
       dan berapa jeda yang sedang berlaku. Keduanya dipakai agar handler
       visibilitas tidak bisa menerobos tangga backoff: di site tanpa
       internet lastOkAt selamanya 0, sehingga tanpa penjaga ini setiap
       alt-tab akan memicu satu permintaan gagal baru — persis "console spam
       saat tidak ada internet" yang dilarang. */
    let lastAttemptAt = 0;
    let currentDelayMs = 0;

    const clear = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const schedule = (ms: number) => {
      clear();
      currentDelayMs = ms;
      timer = setTimeout(() => {
        void run();
      }, ms);
    };

    const run = async (): Promise<void> => {
      if (!alive) return;
      clear();

      /* Tab tersembunyi: jangan tembak sama sekali. Jalur SINKRON ini
         sengaja tidak menyentuh setState (aturan React Compiler). */
      if (document.visibilityState === "hidden") {
        schedule(HIDDEN_RECHECK_MS);
        return;
      }

      controller?.abort();
      const ac = new AbortController();
      controller = ac;
      lastAttemptAt = Date.now();
      let timedOut = false;
      const killer = setTimeout(() => {
        timedOut = true;
        ac.abort();
      }, TIMEOUT_MS);

      try {
        /* Semua setState terjadi SETELAH await. Percobaan pertama pun aman:
           state awal sudah loading:true. */
        const next = await fetchWeather(lat, lon, ac.signal);
        if (!alive) return;
        /* permintaan yang lebih baru sudah menggantikan yang ini — jangan
           tulis hasil basi dan jangan ikut menjadwalkan */
        if (controller !== ac) return;
        failures = 0;
        lastOkAt = next.fetchedAt;
        setState({
          data: next,
          error: null,
          loading: false,
          nowMs: Date.now(),
        });
        schedule(withJitter(WEATHER_REFRESH_MS));
      } catch (err) {
        if (!alive) return;
        /* dibatalkan karena digantikan permintaan lebih baru — bukan
           kegagalan jaringan, jadi tidak boleh menaikkan backoff */
        if (controller !== ac) return;
        failures += 1;
        const reason: WeatherErrorReason = timedOut
          ? "timeout"
          : err instanceof WeatherFetchError
            ? err.reason
            : "network";
        /* data lama DIPERTAHANKAN — hanya error yang diperbarui. Tidak ada
           console.error di sini: kegagalan jaringan adalah keadaan normal
           di site, bukan bug. */
        setState((s) => ({
          data: s.data,
          error: reason,
          loading: false,
          /* stempel LAMA dipertahankan: datanya tidak berubah, jadi usianya
             memang harus terus bertambah. */
          nowMs: s.nowMs,
        }));
        schedule(backoffMs(failures));
      } finally {
        clearTimeout(killer);
        if (controller === ac) controller = null;
      }
    };

    const onVisibility = () => {
      if (!alive) return;
      if (document.visibilityState !== "visible") return;
      /* Hormati jadwal yang sedang berjalan: kalau jeda saat ini belum
         habis, biarkan timer yang menembak. Ini yang membuat tangga
         30s -> 8m tetap utuh meski operator bolak-balik alt-tab. */
      if (lastAttemptAt !== 0 && Date.now() - lastAttemptAt < currentDelayMs) {
        return;
      }
      /* Segarkan sekarang hanya untuk kasus SEHAT tapi basi (mis. laptop
         baru dibuka setelah tidur semalam). */
      if (lastOkAt !== 0 && Date.now() - lastOkAt > STALE_MS) void run();
    };

    document.addEventListener("visibilitychange", onVisibility);
    void run();

    return () => {
      alive = false;
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
      controller?.abort();
      controller = null;
    };
  }, [lat, lon]);

  const scene = React.useMemo<WeatherSceneState>(
    () =>
      state.data === null
        ? IDLE_SCENE
        : {
            kind: state.data.kind,
            intensity: state.data.intensity,
            isDay: state.data.isDay,
          },
    [state.data]
  );

  const value = React.useMemo<WeatherContextValue>(
    () => ({
      scene,
      data: state.data,
      locationLabel: loc?.label ?? "",
      locationArea: loc?.area ?? "",
      lat: loc?.lat ?? null,
      lon: loc?.lon ?? null,
      locationSource: loc?.source ?? "fallback",
      /* loading sampai lokasi terselesaikan DAN fetch pertama selesai */
      loading: loc === null || state.loading,
      error: state.error,
      nowMs: state.nowMs,
    }),
    [scene, state.data, state.loading, state.error, state.nowMs, loc]
  );

  return <WeatherCtx.Provider value={value}>{children}</WeatherCtx.Provider>;
}

/* Tidak pernah melempar. Di development, ketiadaan provider diperingatkan
   SEKALI per sesi supaya bug pemasangan tidak menyamar sebagai kartu offline
   yang tenang; di production baris ini hilang bersama dead-code elimination,
   jadi site tanpa internet tetap senyap total. */
export function useWeather(): WeatherContextValue {
  const ctx = React.useContext(WeatherCtx);
  if (ctx === null) {
    /* Peringatan pemasangan hanya di dev, dan TIDAK menulis variabel modul
       saat render (itu efek samping terlarang). console.warn sendiri sudah
       ter-dedupe oleh devtools per pesan identik. */
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[weather] useWeather() dipanggil di luar <WeatherProvider>. " +
          "Fitur cuaca tidak akan pernah mengambil data. " +
          "Pasang <WeatherProvider> di app/(app)/layout.tsx."
      );
    }
    return FALLBACK;
  }
  return ctx;
}

/* Kontrol pengguna untuk mematikan lapisan efek (WCAG 2.2.2 Pause/Stop/Hide).
   prefers-reduced-motion tetap berlaku terpisah sebagai jalur OS. */
export function useWeatherEffects(): {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
} {
  const enabled = React.useSyncExternalStore(
    subscribeWeatherEffects,
    getWeatherEffectsSnapshot,
    getWeatherEffectsServerSnapshot
  );
  return { enabled, setEnabled: setWeatherEffectsEnabled };
}

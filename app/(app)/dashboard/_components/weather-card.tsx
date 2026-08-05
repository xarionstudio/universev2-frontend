"use client";

import * as React from "react";
import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import type { LocationSource } from "@/lib/weather/geolocate";
import type {
  Weather,
  WeatherKind,
  WeatherLabelKey,
} from "@/lib/weather/open-meteo";
import {
  useWeather,
  useWeatherEffects,
  WEATHER_REFRESH_MS,
} from "@/components/providers/weather";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

/* ============================================================
   Kartu cuaca dashboard — KONTEKS, bukan KPI.

   Bobot visualnya sengaja di bawah StatCard: chip size-11 (sama, bukan
   lebih besar), suhu text-xl (bukan text-[32px] yang setara angka KPI),
   dan seluruh isinya satu baris. Cuaca tidak boleh jadi angka terbesar di
   halaman yang tugas utamanya menampilkan daftar perhatian. Kartunya juga
   dipasang DI BAWAH panel perhatian, bukan menyela antara KPI dan panel.

   Kegagalan jaringan TIDAK pernah tampil sebagai alert. Kalau belum pernah
   ada data yang berhasil dimuat, kartu ini merender null — tidak ada kotak
   "cuaca tidak tersedia", tidak ada tombol coba lagi. Halaman tampil persis
   seperti sebelum fitur ini ada, sesuai syarat degradasi diam-diam.

   Sumber data: useWeather() — satu provider di app/(app)/layout.tsx dipakai
   bersama lapisan efek latar, jadi kartu ini TIDAK fetch sendiri.
   ============================================================ */

/* Semua labelKey dari lib/weather WAJIB ada di kamus. Baris ini membuat
   pelanggaran jadi error compile di sini, bukan `undefined` di layar. */
type AssertLabelKeys = WeatherLabelKey extends keyof Dict ? true : never;
const LABEL_KEYS_EXIST: AssertLabelKeys = true;
void LABEL_KEYS_EXIST;

/* Ambang usia data. Provider mempertahankan data lama saat refresh gagal —
   itu benar, tapi menampilkannya dengan percaya diri yang sama seperti data
   segar tidak benar: di site batu bara, hujan menggerakkan keputusan haul
   road dan stop work. Jadi umur data mengendalikan SELURUH kartu, bukan
   cuma dua kata di pojok. */
const STALE_MS = 30 * 60 * 1000; /* > 30 mnt: angka detail disembunyikan */
const HIDE_MS = 6 * 60 * 60 * 1000; /* > 6 jam: kartu menghilang total */

/* Stempel jam SELALU di zona site, bukan zona perangkat. Indonesia punya
   tiga zona: laptop kantor pusat ber-WIB yang merender jam lokalnya sendiri
   lalu diberi label "WITA" adalah stempel yang tampak otoritatif dan diam-
   diam meleset satu jam. Sumbernya juga waktu OBSERVASI dari API, bukan
   Date.now() klien — PC site yang tidak bisa NTP sering jamnya melenceng. */
const WITA = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type IconStyle = { background: string; borderColor: string; color: string };

/* Kosakata warna kartu ini SENGAJA di luar kosakata badge status.
   --badge-warning-* berarti "butuh perhatian" di seluruh aplikasi; memakai
   amber untuk "Cerah" — kondisi paling sering dan paling tidak actionable —
   akan menaruh dua chip amber identik bersebelahan dengan StatCard "belum
   absen", dan sekaligus melucuti sinyal warna dari badai. */
const CALM_ICON: IconStyle = {
  background: "var(--fill-subtle)",
  borderColor: "var(--divider)",
  color: "var(--text-secondary)",
};

const WATER_ICON: IconStyle = {
  background: "var(--badge-info-fill)",
  borderColor: "var(--badge-info-border)",
  color: "var(--badge-info-text)",
};

/* Satu-satunya kondisi yang boleh menarik mata: petir = stop work. */
const STORM_ICON: IconStyle = {
  background: "var(--badge-danger-fill)",
  borderColor: "var(--badge-danger-border)",
  color: "var(--badge-danger-text)",
};

function kindIcon(kind: WeatherKind, isDay: boolean): React.ReactNode {
  switch (kind) {
    case "sun":
      return isDay ? <Sun /> : <Moon />;
    case "rain":
      return <CloudRain />;
    case "storm":
      return <Zap />;
    case "fog":
      return <CloudFog />;
    default:
      return <Cloud />;
  }
}

function kindIconStyle(kind: WeatherKind, stale: boolean): IconStyle {
  if (stale) return CALM_ICON;
  switch (kind) {
    case "rain":
      return WATER_ICON;
    case "storm":
      return STORM_ICON;
    default:
      return CALM_ICON;
  }
}

/* Angka yang tidak dikirim API dirender em dash, TIDAK PERNAH 0 —
   0 °C / 0 % di Balikpapan adalah pengukuran palsu yang tidak bisa
   dibedakan dari yang asli. */
function n(value: number | null, unit: string, digits = 0): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

function ageLabel(t: Dict, ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return t.wxAgoMin.replace("%n", String(Math.max(1, min)));
  return t.wxAgoHour.replace("%n", String(Math.floor(min / 60)));
}

/* Satu petak metrik. Sengaja TIDAK memakai glass-card: halaman sudah
   membayar backdrop-filter untuk panel, StatCard, dan dua blob blur.

   Label DI ATAS nilai, bukan sebaris. Versi sebelumnya menaruh keempat metrik
   sebagai teks mengalir di kiri kartu selebar layar, menyisakan sepertiga
   kanan kartu kosong melompong. Bentuk dua baris membuat tiap metrik jadi
   kolom yang bisa dibagi rata sampai tepi kanan — ruangnya terpakai, dan
   angkanya jadi berbaris rapi (tabular-nums) alih-alih berloncatan mengikuti
   panjang labelnya. */
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-(--divider) px-4 first:border-l-0 max-sm:border-l-0 max-sm:px-0">
      <div className="flex items-center gap-1.5 text-xs text-(--text-tertiary) [&_svg]:size-3.5 [&_svg]:flex-none">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <b className="mt-0.5 block text-sm font-semibold text-(--text-primary) tabular-nums">
        {value}
      </b>
    </div>
  );
}

export function WeatherCard({ className }: { className?: string }) {
  const { t } = useI18n();
  const {
    data,
    locationLabel,
    locationArea,
    locationSource,
    lat,
    lon,
    loading,
    nowMs,
  } = useWeather();
  const { enabled: fxOn, setEnabled: setFx } = useWeatherEffects();

  /* Belum pernah ada data yang berhasil: skeleton ringkas selama percobaan
     pertama, lalu NULL. Tidak ada kotak error. `data` selalu null saat SSR,
     jadi Date.now() di bawah tidak pernah jalan di server. */
  if (data === null) {
    return loading ? (
      <Panel className={className}>
        <div className="flex items-center gap-3">
          <Skeleton style={{ width: 44, height: 44, borderRadius: 14 }} />
          <Skeleton style={{ width: 180, height: 20 }} />
        </div>
      </Panel>
    ) : null;
  }

  const stampMs = data.observedAtMs ?? data.fetchedAt;
  /* `nowMs` distempel provider saat menyetel state, BUKAN dibaca di sini:
     Date.now() saat render adalah pemanggilan tak-murni dan hasilnya berubah
     tiap kali komponen kebetulan dirender ulang. */
  const ageMs = Math.max(0, nowMs - stampMs);
  if (ageMs > HIDE_MS) return null;

  const stale = ageMs > STALE_MS;
  const clock = `${WITA.format(new Date(stampMs))} ${t.wxTz}`;

  return (
    <Panel className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* Ikon judul TIDAK boleh berupa glyph kondisi: SectionTitle memaksa
            text-primary-bright, sehingga awan cyan di judul akan berdebat
            dengan matahari di badan kartu. CloudSun dipakai sebagai lambang
            KATEGORI "cuaca" — tetap netral terhadap kondisi yang sedang
            berlaku. MapPin dipindah ke baris lokasi, tempat ia benar-benar
            menerangkan sesuatu; dua pin identik dalam satu kartu kecil hanya
            mengulang hal yang sama dua kali. */}
        <SectionTitle className="mb-0">
          <CloudSun />
          {t.wxTitle}
        </SectionTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--text-tertiary)">
            {stale ? (
              <>
                {t.wxLastKnown}{" "}
                <b className="font-medium text-(--text-secondary)">
                  {ageLabel(t, ageMs)}
                </b>
              </>
            ) : (
              <>
                {t.wxUpdated}{" "}
                <b className="font-mono font-medium text-(--text-secondary)">
                  {clock}
                </b>
              </>
            )}
          </span>
          {/* WCAG 2.2.2 Pause/Stop/Hide: kontrol nyata untuk mematikan
              lapisan latar. Kartunya tetap ada — hanya efeknya yang mati. */}
          <button
            type="button"
            onClick={() => setFx(!fxOn)}
            aria-pressed={fxOn}
            className="rounded-chip border border-(--divider) bg-(--fill-subtle) px-2 py-1 text-xs text-(--text-secondary) transition-colors hover:text-(--text-primary)"
          >
            {fxOn ? t.wxEffectsOn : t.wxEffectsOff}
          </button>
        </div>
      </div>

      <WeatherBody
        t={t}
        data={data}
        locationLabel={locationLabel}
        locationArea={locationArea}
        locationSource={locationSource}
        lat={lat}
        lon={lon}
        stale={stale}
      />
    </Panel>
  );
}

function WeatherBody({
  t,
  data,
  locationLabel,
  locationArea,
  locationSource,
  lat,
  lon,
  stale,
}: {
  t: Dict;
  data: Weather;
  locationLabel: string;
  locationArea: string;
  locationSource: LocationSource;
  lat: number | null;
  lon: number | null;
  stale: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid size-11 flex-none place-items-center rounded-icon border [&_svg]:size-5"
          style={kindIconStyle(data.kind, stale)}
        >
          {kindIcon(data.kind, data.isDay)}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl leading-tight font-semibold tabular-nums">
              {n(data.tempC, t.wxUnitTemp)}
            </span>
            <span className="truncate text-xs text-(--text-secondary)">
              {t[data.labelKey]}
            </span>
          </div>
          {/* Lokasi jadi barisnya SENDIRI, bukan ekor di belakang kondisi.
              Sebelumnya keduanya disambung ("Cerah · Kaubun") sehingga penanda
              lokasi — satu-satunya bagian kartu yang bisa salah tanpa
              ketahuan — justru yang paling tidak terlihat. Nama tempat
              ditegaskan, kabupaten mengikut sebagai konteks. */}
          <div className="mt-0.5 flex items-center gap-1.25 text-xs">
            <MapPin className="size-3.25 flex-none text-(--text-tertiary)" />
            <span className="truncate">
              <b className="font-semibold text-(--text-secondary)">
                {locationLabel || t.wxCurrentLocation}
              </b>
              {locationArea && locationArea !== locationLabel ? (
                <span className="text-(--text-tertiary)">
                  {" · "}
                  {locationArea}
                </span>
              ) : null}
            </span>
            {/* Koordinat yang dipakai mengambil cuaca. Nama tempat hasil
                geocoder bisa meleset satu tingkat administratif (desa ->
                kecamatan) tanpa ada tanda apa pun di layar; koordinat bisa
                langsung dicocokkan operator dengan peta, jadi kartu ini
                berhenti meminta kepercayaan buta. */}
            {lat !== null && lon !== null ? (
              <span className="flex-none font-mono text-[10px] text-(--text-disabled)">
                {lat.toFixed(4)}, {lon.toFixed(4)}
              </span>
            ) : null}
            {/* Kejujuran presisi: GPS = tepat (tanpa catatan); IP & fallback =
                perkiraan tingkat kota. Chip kecil, bukan tanda kurung yang
                terbaca sebagai bagian dari nama tempat. */}
            {locationSource !== "gps" ? (
              <span className="flex-none rounded-chip border border-(--divider) px-1.5 text-[10px] text-(--text-tertiary)">
                {t.wxSiteApprox}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Petir: sinyal operasional, bukan hiasan. Ini alasan `storm` dipisah
          dari `rain` sama sekali, dan satu-satunya tempat sinyal itu boleh
          hidup — bukan sebagai kedipan layar. */}
      {data.kind === "storm" && !stale ? (
        <span
          className="rounded-chip border px-2 py-1 text-xs font-medium"
          style={STORM_ICON}
        >
          {t.wxStormWarn}
        </span>
      ) : null}

      {/* Data basi: kondisi tetap ditampilkan sebagai ingatan, tapi angka
          detailnya berhenti diklaim. */}
      {!stale ? (
        /* ml-auto + flex-1 + grid-cols-4: blok metrik mengambil SELURUH sisa
           lebar dan membaginya rata, jadi kartu terisi sampai tepi kanan alih-
           alih berhenti di sepertiga kiri. Di ponsel kembali jadi dua kolom
           yang mengalir. */
        <div className="ml-auto grid flex-1 grid-cols-4 items-start max-sm:ml-0 max-sm:w-full max-sm:grid-cols-2 max-sm:gap-x-5 max-sm:gap-y-3">
          <Metric
            icon={<Thermometer />}
            label={t.wxFeels}
            value={n(data.feelsLikeC, t.wxUnitTemp)}
          />
          <Metric
            icon={<Droplets />}
            label={t.wxHumidity}
            value={n(data.humidityPct, t.wxUnitHum)}
          />
          <Metric
            icon={<Wind />}
            label={t.wxWind}
            value={
              data.windKph === null
                ? "—"
                : `${Math.round(data.windKph)} ${t.wxUnitWind}`
            }
          />
          <Metric
            icon={<CloudRain />}
            label={t.wxPrecip}
            value={
              data.precipMm === null
                ? "—"
                : `${data.precipMm.toFixed(1)} ${t.wxUnitPrecip}`
            }
          />
        </div>
      ) : null}
    </div>
  );
}

/* Dipakai hanya untuk menjaga import WEATHER_REFRESH_MS tetap bermakna bila
   ambang basi ingin diturunkan dari periode refresh di kemudian hari. */
void WEATHER_REFRESH_MS;

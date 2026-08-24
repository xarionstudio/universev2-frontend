"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import type { LocationSource } from "@/lib/weather/geolocate";
import type { Weather, WeatherKind } from "@/lib/weather/open-meteo";
import {
  useWeather,
  useWeatherEffects,
  WEATHER_REFRESH_MS,
} from "@/components/providers/weather";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

import {
  kindVisual,
  TitleCloudSunIcon,
  WeatherKindIcon,
  WeatherMetricIcon,
  type WeatherMetricKind,
} from "./weather-icons";

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

type AssertLabelKeys =
  import("@/lib/weather/open-meteo").WeatherLabelKey extends keyof Dict
    ? true
    : never;
const LABEL_KEYS_EXIST: AssertLabelKeys = true;
void LABEL_KEYS_EXIST;

const STALE_MS = 30 * 60 * 1000;
const HIDE_MS = 6 * 60 * 60 * 1000;

const WITA = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const STORM_CHIP = {
  background: "var(--badge-danger-fill)",
  borderColor: "var(--badge-danger-border)",
  color: "var(--badge-danger-text)",
  boxShadow: "0 0 16px rgba(252, 60, 59, 0.25)",
};

function n(value: number | null, unit: string, digits = 0): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

function ageLabel(t: Dict, ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return t.wxAgoMin.replace("%n", String(Math.max(1, min)));
  return t.wxAgoHour.replace("%n", String(Math.floor(min / 60)));
}

function Metric({
  kind,
  label,
  value,
}: {
  kind: WeatherMetricKind;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-(--divider)/60 px-4 first:border-l-0 max-sm:border-l-0 max-sm:px-0">
      <div className="flex items-center gap-2 text-xs text-(--text-tertiary)">
        <span className="wx-metric-badge">
          <WeatherMetricIcon kind={kind} className="size-3.5" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <b className="mt-1 block pl-7 text-sm font-semibold text-(--text-primary) tabular-nums">
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

  if (data === null) {
    return loading ? (
      <Panel className={className}>
        <div className="flex items-center gap-3">
          <Skeleton style={{ width: 52, height: 52, borderRadius: 14 }} />
          <Skeleton style={{ width: 180, height: 20 }} />
        </div>
      </Panel>
    ) : null;
  }

  const stampMs = data.observedAtMs ?? data.fetchedAt;
  const ageMs = Math.max(0, nowMs - stampMs);
  if (ageMs > HIDE_MS) return null;

  const stale = ageMs > STALE_MS;
  const clock = `${WITA.format(new Date(stampMs))} ${t.wxTz}`;

  return (
    <Panel className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle className="mb-0">
          <TitleCloudSunIcon className="size-4" />
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
          <button
            type="button"
            onClick={() => setFx(!fxOn)}
            aria-pressed={fxOn}
            className="rounded-chip border border-(--divider) bg-(--fill-subtle) px-2 py-1 text-xs text-(--text-secondary) transition-colors hover:border-primary/30 hover:text-(--text-primary)"
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

function KindOrb({
  kind,
  isDay,
  stale,
}: {
  kind: WeatherKind;
  isDay: boolean;
  stale: boolean;
}) {
  const visual = kindVisual(kind, stale);
  return (
    <div
      className="wx-kind-orb size-[52px] flex-none [&_svg]:size-8"
      style={
        {
          background: visual.bg,
          borderColor: visual.border,
          "--wx-kind-glow": visual.glow,
        } as React.CSSProperties
      }
    >
      <WeatherKindIcon kind={kind} isDay={isDay} stale={stale} />
    </div>
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
    <div className="wx-card-body flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <KindOrb kind={data.kind} isDay={data.isDay} stale={stale} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="bg-linear-to-br from-(--text-primary) to-primary-bright bg-clip-text text-xl leading-tight font-bold text-transparent tabular-nums">
              {n(data.tempC, t.wxUnitTemp)}
            </span>
            <span className="truncate text-xs font-medium text-(--text-secondary)">
              {t[data.labelKey]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <MapPin className="size-3.25 flex-none text-primary/80" />
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
            {lat !== null && lon !== null ? (
              <span className="flex-none font-mono text-[10px] text-(--text-tertiary)">
                {lat.toFixed(4)}, {lon.toFixed(4)}
              </span>
            ) : null}
            {locationSource !== "gps" ? (
              <span className="flex-none rounded-chip border border-(--divider) bg-(--fill-subtle) px-1.5 text-[10px] text-(--text-tertiary)">
                {t.wxSiteApprox}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {data.kind === "storm" && !stale ? (
        <span
          className="rounded-chip border px-2 py-1 text-xs font-medium"
          style={STORM_CHIP}
        >
          {t.wxStormWarn}
        </span>
      ) : null}

      {!stale ? (
        <div className="ml-auto grid flex-1 grid-cols-4 items-start max-sm:ml-0 max-sm:w-full max-sm:grid-cols-2 max-sm:gap-x-5 max-sm:gap-y-3">
          <Metric
            kind="feels"
            label={t.wxFeels}
            value={n(data.feelsLikeC, t.wxUnitTemp)}
          />
          <Metric
            kind="humidity"
            label={t.wxHumidity}
            value={n(data.humidityPct, t.wxUnitHum)}
          />
          <Metric
            kind="wind"
            label={t.wxWind}
            value={
              data.windKph === null
                ? "—"
                : `${Math.round(data.windKph)} ${t.wxUnitWind}`
            }
          />
          <Metric
            kind="precip"
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

void WEATHER_REFRESH_MS;

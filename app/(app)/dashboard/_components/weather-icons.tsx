"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/lib/weather/open-meteo";

/* Ikon cuaca premium — SVG dengan gradien, kedalaman, dan glow halus.
   Menggantikan glyph Lucide monokrom agar kartu glassmorphism terasa
   lebih hidup tanpa mengorbankan elegan. */

type IconProps = { className?: string; stale?: boolean };

function SunIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${g}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7c2" />
          <stop offset="45%" stopColor="#ffd54a" />
          <stop offset="100%" stopColor="#ff9f1a" />
        </radialGradient>
        <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd54a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff9f1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill={`url(#${g}-glow)`} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="24"
          y1="24"
          x2="24"
          y2="6"
          stroke="#ffc947"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${deg} 24 24)`}
          opacity="0.85"
        />
      ))}
      <circle cx="24" cy="24" r="10" fill={`url(#${g}-core)`} />
      <circle cx="21" cy="21" r="3" fill="white" opacity="0.35" />
    </svg>
  );
}

function MoonIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-moon`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8f4ff" />
          <stop offset="50%" stopColor="#a8c8ff" />
          <stop offset="100%" stopColor="#6b8cff" />
        </linearGradient>
        <radialGradient id={`${g}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8ab4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4a6cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill={`url(#${g}-halo)`} />
      <path
        d="M28 8a14 14 0 1 0 0 28 11 11 0 0 1 0-28z"
        fill={`url(#${g}-moon)`}
      />
      <circle cx="30" cy="16" r="1.5" fill="white" opacity="0.5" />
      <circle cx="34" cy="22" r="1" fill="white" opacity="0.35" />
      <circle cx="32" cy="28" r="0.8" fill="white" opacity="0.25" />
    </svg>
  );
}

function CloudIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-cloud`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#b8cce8" />
        </linearGradient>
        <linearGradient id={`${g}-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8aa4c4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#5a7494" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="30" rx="18" ry="6" fill={`url(#${g}-shadow)`} />
      <path
        d="M14 30a8 8 0 0 1-.5-2.8A9 9 0 0 1 22 18a11 11 0 0 1 20.5 3.2A7.5 7.5 0 0 1 38 34H16a6 6 0 0 1-2-4z"
        fill={`url(#${g}-cloud)`}
      />
      <ellipse cx="20" cy="26" rx="6" ry="3" fill="white" opacity="0.45" />
    </svg>
  );
}

function RainIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-cloud`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4e8ff" />
          <stop offset="100%" stopColor="#7aa8d8" />
        </linearGradient>
        <linearGradient id={`${g}-drop`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5ec8ff" />
          <stop offset="100%" stopColor="#0091ff" />
        </linearGradient>
      </defs>
      <path
        d="M12 26a7 7 0 0 1-.4-2.3A8 8 0 0 1 19 16a10 10 0 0 1 18.8 2.8A6.5 6.5 0 0 1 35 28H14a4 4 0 0 1-2-2z"
        fill={`url(#${g}-cloud)`}
      />
      {[
        [17, 32],
        [24, 34],
        [31, 32],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path
            d={`M${x} ${y} l-2 5 a2 2 0 0 0 4 0 z`}
            fill={`url(#${g}-drop)`}
            opacity="0.9"
          />
          <path
            d={`M${x} ${y} l-2 5 a2 2 0 0 0 4 0 z`}
            fill="#00d4ff"
            opacity="0.25"
            transform={`translate(0 1)`}
          />
        </g>
      ))}
    </svg>
  );
}

function StormIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-cloud`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4b8e8" />
          <stop offset="100%" stopColor="#6a5898" />
        </linearGradient>
        <linearGradient id={`${g}-bolt`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe566" />
          <stop offset="100%" stopColor="#ff9f1a" />
        </linearGradient>
        <filter id={`${g}-glow`}>
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M10 24a6.5 6.5 0 0 1-.3-2.1A7.5 7.5 0 0 1 17 14a9.5 9.5 0 0 1 17.8 2.7A6 6 0 0 1 36 26H12a4 4 0 0 1-2-2z"
        fill={`url(#${g}-cloud)`}
      />
      <path
        d="M26 22 l-4 8 h4 l-3 8 8-11 h-4 l3-5z"
        fill={`url(#${g}-bolt)`}
        filter={`url(#${g}-glow)`}
      />
    </svg>
  );
}

function FogIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-fog`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c8d8e8" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#e8f0f8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c8d8e8" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {[18, 24, 30].map((y, i) => (
        <rect
          key={y}
          x={8 + i * 2}
          y={y}
          width={32 - i * 4}
          height="4"
          rx="2"
          fill={`url(#${g}-fog)`}
        />
      ))}
    </svg>
  );
}

export type WeatherMetricKind = "feels" | "humidity" | "wind" | "precip";

function MetricFeelsIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-t`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ff6b4a" />
          <stop offset="100%" stopColor="#ffb347" />
        </linearGradient>
      </defs>
      <rect x="8" y="3" width="4" height="12" rx="2" fill={`url(#${g}-t)`} />
      <circle cx="10" cy="14" r="3.5" fill={`url(#${g}-t)`} />
      <rect
        x="9.25"
        y="5"
        width="1.5"
        height="6"
        rx="0.75"
        fill="white"
        opacity="0.35"
      />
    </svg>
  );
}

function MetricHumidityIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-h`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5ec8ff" />
          <stop offset="100%" stopColor="#0091ff" />
        </linearGradient>
      </defs>
      <path
        d="M10 3 C6 9 4 11.5 4 14 a6 6 0 0 0 12 0 c0-2.5-2-5-6-11z"
        fill={`url(#${g}-h)`}
      />
      <ellipse cx="9" cy="13" rx="2" ry="1.5" fill="white" opacity="0.3" />
    </svg>
  );
}

function MetricWindIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-w`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#17ce64" />
        </linearGradient>
      </defs>
      <path
        d="M3 6 h10 a3 3 0 1 0 0-6"
        stroke={`url(#${g}-w)`}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 11 h12 a2.5 2.5 0 1 1 0 5"
        stroke={`url(#${g}-w)`}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 16 h8"
        stroke={`url(#${g}-w)`}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function MetricPrecipIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-p`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7ab8ff" />
          <stop offset="100%" stopColor="#0054c7" />
        </linearGradient>
      </defs>
      <path
        d="M4 10 a4 4 0 0 1-.2-1.3A5 5 0 0 1 8 4a6 6 0 0 1 11.2 1.7A4 4 0 0 1 18 12H6a2.5 2.5 0 0 1-2-2z"
        fill={`url(#${g}-p)`}
        opacity="0.85"
      />
      <path d="M8 14 l-1 2.5 a1 1 0 0 0 2 0z" fill="#00d4ff" />
      <path d="M12 15 l-1 2.5 a1 1 0 0 0 2 0z" fill="#0091ff" />
    </svg>
  );
}

function TitleCloudSunIcon({ className }: IconProps) {
  const g = React.useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${g}-s`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#0091ff" />
        </linearGradient>
      </defs>
      <circle cx="7" cy="7" r="3.5" fill={`url(#${g}-s)`} />
      <path
        d="M4 13 a3 3 0 0 1-.1-.9A3.5 3.5 0 0 1 7.5 9a4 4 0 0 1 7.5 1.1A2.8 2.8 0 0 1 14 14H5.5a1.8 1.8 0 0 1-1.5-1z"
        fill="white"
        opacity="0.85"
      />
    </svg>
  );
}

export type KindVisual = {
  glow: string;
  border: string;
  bg: string;
};

export function kindVisual(kind: WeatherKind, stale: boolean): KindVisual {
  if (stale) {
    return {
      glow: "var(--wx-icon-glow-muted)",
      border: "var(--wx-icon-border-muted)",
      bg: "var(--wx-icon-bg-muted)",
    };
  }
  switch (kind) {
    case "sun":
      return {
        glow: "var(--wx-icon-glow-sun)",
        border: "rgba(255, 180, 50, 0.45)",
        bg: "linear-gradient(145deg, rgba(255, 210, 80, 0.22) 0%, rgba(255, 150, 30, 0.08) 100%)",
      };
    case "rain":
      return {
        glow: "var(--wx-icon-glow-rain)",
        border: "rgba(0, 145, 255, 0.4)",
        bg: "linear-gradient(145deg, rgba(0, 212, 255, 0.18) 0%, rgba(0, 84, 199, 0.08) 100%)",
      };
    case "storm":
      return {
        glow: "var(--wx-icon-glow-storm)",
        border: "rgba(180, 100, 255, 0.45)",
        bg: "linear-gradient(145deg, rgba(180, 120, 255, 0.2) 0%, rgba(100, 60, 180, 0.1) 100%)",
      };
    case "fog":
      return {
        glow: "var(--wx-icon-glow-fog)",
        border: "rgba(160, 180, 210, 0.4)",
        bg: "linear-gradient(145deg, rgba(200, 220, 240, 0.18) 0%, rgba(140, 160, 190, 0.08) 100%)",
      };
    default:
      return {
        glow: "var(--wx-icon-glow-cloud)",
        border: "rgba(160, 190, 230, 0.35)",
        bg: "linear-gradient(145deg, rgba(200, 220, 255, 0.16) 0%, rgba(140, 170, 210, 0.07) 100%)",
      };
  }
}

export function WeatherKindIcon({
  kind,
  isDay,
  stale,
  className,
}: {
  kind: WeatherKind;
  isDay: boolean;
  stale?: boolean;
  className?: string;
}) {
  void stale;
  if (kind === "sun")
    return isDay ? (
      <SunIcon className={className} />
    ) : (
      <MoonIcon className={className} />
    );
  if (kind === "rain") return <RainIcon className={className} />;
  if (kind === "storm") return <StormIcon className={className} />;
  if (kind === "fog") return <FogIcon className={className} />;
  return <CloudIcon className={className} />;
}

export function WeatherMetricIcon({
  kind,
  className,
}: {
  kind: WeatherMetricKind;
  className?: string;
}) {
  switch (kind) {
    case "feels":
      return <MetricFeelsIcon className={className} />;
    case "humidity":
      return <MetricHumidityIcon className={className} />;
    case "wind":
      return <MetricWindIcon className={className} />;
    case "precip":
      return <MetricPrecipIcon className={className} />;
  }
}

export { TitleCloudSunIcon };

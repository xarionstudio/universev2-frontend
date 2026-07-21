"use client";

import * as React from "react";

import { useWeather, useWeatherEffects } from "@/components/providers/weather";
import { WeatherScene } from "@/components/ui/weather-scene";

/* Jembatan tipis antara context cuaca dan scene.
 *
 * Dipisah dari app/(app)/layout.tsx dengan sengaja: layout adalah komponen
 * besar yang juga menghitung RBAC, dan kalau ia sendiri memanggil
 * useWeather() maka seluruh shell akan render ulang tiap kali cuaca masuk.
 * Di sini hanya komponen kecil ini yang render ulang.
 *
 * Tugas kedua: menstempel data-wx="motion" di <html> selama ada lapisan yang
 * BERGERAK (hanya hujan/badai). globals.css memakai penanda itu untuk
 * mematikan backdrop-filter pada kaca dan menggantinya dengan isian token
 * yang lebih pekat, sehingga tidak ada gaussian blur selebar layar yang
 * dihitung ulang 60x per detik. Efek statis (cerah/mendung/kabut/malam)
 * tidak menstempel apa pun — kacanya tetap blur seperti hari ini.
 *
 * Tidak ada setState di dalam useEffect (hanya mutasi atribut DOM), jadi
 * aturan React Compiler terpenuhi. */
export function WeatherLayer() {
  const { scene } = useWeather();
  const { enabled } = useWeatherEffects();

  const active = enabled && scene.kind !== "unknown";
  const motion = active && (scene.kind === "rain" || scene.kind === "storm");

  React.useEffect(() => {
    const root = document.documentElement;
    if (motion) root.setAttribute("data-wx", "motion");
    else root.removeAttribute("data-wx");
    return () => {
      root.removeAttribute("data-wx");
    };
  }, [motion]);

  /* Inilah seluruh jalur "degradasi diam-diam": gagal fetch, timeout, site
     tidak dikenal, atau operator mematikan efeknya -> nol elemen, halaman
     tampil persis seperti sebelum fitur ini ada. */
  if (!active) return null;

  return <WeatherScene {...scene} />;
}

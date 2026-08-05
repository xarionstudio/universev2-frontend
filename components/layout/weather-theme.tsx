"use client";

import * as React from "react";

import {
  useTheme,
  type ThemeResolved,
} from "@/components/providers/theme-provider";
import { useWeather } from "@/components/providers/weather";

/* Jembatan cuaca -> tema. Komponen tanpa tampilan.

   Dipisah dari layout dengan alasan yang sama seperti <WeatherLayer>: layout
   juga menghitung RBAC, dan kalau ia sendiri memanggil useWeather() maka
   seluruh shell dirender ulang tiap data cuaca masuk.

   Kenapa jembatan, bukan langsung di ThemeProvider: ThemeProvider hidup di
   root (membungkus login & halaman kiosk juga), sedangkan WeatherProvider
   hanya dipasang di dalam shell admin. Membalik urutannya berarti halaman
   login ikut menembak GPS dan API cuaca hanya demi warna. */

/* Aturan pemetaan — hanya dua yang diminta eksplisit (cerah -> terang,
   hujan -> gelap); sisanya diturunkan agar tidak ada kondisi yang menggantung:

     malam        -> GELAP, apa pun cuacanya. Ini mendahului aturan lain:
                     antarmuka putih terang pukul 02:00 di pos shift malam
                     menyilaukan operator yang baru keluar dari kabin gelap,
                     dan "cerah" pada malam hari berarti langit berbintang,
                     bukan matahari.
     hujan/badai  -> GELAP (diminta)
     cerah        -> TERANG (diminta)
     berawan/kabut-> TERANG di siang hari; ia bukan hujan, dan langit mendung
                     tetap terang benderang dibanding malam.
     unknown      -> null, artinya ikut tema sistem seperti sebelumnya. */
function themeOfWeather(kind: string, isDay: boolean): ThemeResolved | null {
  if (kind === "unknown") return null;
  if (!isDay) return "dark";
  if (kind === "rain" || kind === "storm") return "dark";
  return "light";
}

export function WeatherTheme() {
  const { scene } = useWeather();
  const { setWeatherHint } = useTheme();

  const next = themeOfWeather(scene.kind, scene.isDay);

  React.useEffect(() => {
    setWeatherHint(next);
  }, [next, setWeatherHint]);

  return null;
}

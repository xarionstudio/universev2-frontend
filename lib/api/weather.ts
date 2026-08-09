/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/weather.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { WeatherData } from "./types";

export const weatherApi = {
  /** Get current weather from proxy */
  async getCurrentWeather(params?: {
    lat?: number;
    lon?: number;
  }): Promise<WeatherData> {
    return apiFetch<WeatherData>("/weather/current", {
      method: "GET",
      params: params as Record<string, string | number>,
    });
  },
};

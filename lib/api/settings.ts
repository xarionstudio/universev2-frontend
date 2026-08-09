/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/settings.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { AppSettings, AudioSchedule, DisplayDevice } from "./types";

export const settingsApi = {
  /** Fetch application settings */
  async getSettings(): Promise<AppSettings> {
    return apiFetch<AppSettings>("/settings", {
      method: "GET",
    });
  },

  /** Update application settings */
  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    return apiFetch<AppSettings>("/settings", {
      method: "PUT",
      body: data,
    });
  },

  /** Fetch audio schedules */
  async getAudioSchedules(): Promise<AudioSchedule[]> {
    return apiFetch<AudioSchedule[]>("/settings/audio", {
      method: "GET",
    });
  },

  /** Create audio schedule */
  async createAudioSchedule(
    data: Partial<AudioSchedule>
  ): Promise<AudioSchedule> {
    return apiFetch<AudioSchedule>("/settings/audio", {
      method: "POST",
      body: data,
    });
  },

  /** Update audio schedule */
  async updateAudioSchedule(
    id: number,
    data: Partial<AudioSchedule>
  ): Promise<AudioSchedule> {
    return apiFetch<AudioSchedule>(`/settings/audio/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete audio schedule */
  async deleteAudioSchedule(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/settings/audio/${id}`, {
      method: "DELETE",
    });
  },

  /** Fetch kiosk displays */
  async getDisplays(): Promise<DisplayDevice[]> {
    return apiFetch<DisplayDevice[]>("/settings/displays", {
      method: "GET",
    });
  },

  /** Create display device */
  async createDisplay(data: Partial<DisplayDevice>): Promise<DisplayDevice> {
    return apiFetch<DisplayDevice>("/settings/displays", {
      method: "POST",
      body: data,
    });
  },

  /** Update display device */
  async updateDisplay(
    id: number,
    data: Partial<DisplayDevice>
  ): Promise<DisplayDevice> {
    return apiFetch<DisplayDevice>(`/settings/displays/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete display device */
  async deleteDisplay(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/settings/displays/${id}`, {
      method: "DELETE",
    });
  },
};

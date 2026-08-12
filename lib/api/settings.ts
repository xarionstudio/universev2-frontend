/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/settings.ts
 *
 * Settings API endpoints — app settings, audio schedules, displays,
 * and business rules (configurable constants).
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch, type FetchOptions } from "./client";

// ============================================================================
// App Settings
// ============================================================================

export interface AppSettings {
  appName: string;
  appDesc: string;
  appEnv: string;
  companyLogo: string;
  theme: string;
  lang: string;
  menuVis: Record<string, boolean>;
}

export async function getSettings(): Promise<AppSettings> {
  return apiFetch<AppSettings>("/settings");
}

export async function updateSettings(
  settings: Partial<AppSettings>,
  options?: FetchOptions
): Promise<AppSettings> {
  return apiFetch<AppSettings>("/settings", {
    ...options,
    method: "PUT",
    body: settings,
  });
}

// ============================================================================
// Audio Schedules
// ============================================================================

export interface AudioSchedule {
  id: number;
  title: string;
  when: string;
  freq: string;
  file: string;
  active: boolean;
  displays: string[];
}

export async function getAudioSchedules(): Promise<AudioSchedule[]> {
  return apiFetch<AudioSchedule[]>("/settings/audio");
}

export async function createAudioSchedule(
  schedule: Omit<AudioSchedule, "id">
): Promise<AudioSchedule> {
  return apiFetch<AudioSchedule>("/settings/audio", {
    method: "POST",
    body: schedule,
  });
}

export async function updateAudioSchedule(
  id: number,
  schedule: Partial<AudioSchedule>
): Promise<void> {
  await apiFetch<void>(`/settings/audio/${id}`, {
    method: "PUT",
    body: schedule,
  });
}

export async function deleteAudioSchedule(id: number): Promise<void> {
  await apiFetch<void>(`/settings/audio/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Display Devices
// ============================================================================

export type DisplayKind = "att" | "fleet" | "ftw" | "finger" | "monitor";

export interface DisplayDevice {
  id: number;
  code?: string;
  name: string;
  loc?: string;
  content: DisplayKind;
  fleetId?: number;
  fleetIds?: number[];
  rotateSec?: number;
  runtext: string;
  online?: boolean;
  hb?: string;
  active: boolean;
}

export async function getDisplays(
  kind?: DisplayKind
): Promise<DisplayDevice[]> {
  const qs = kind ? `?kind=${kind}` : "";
  return apiFetch<DisplayDevice[]>(`/settings/displays${qs}`);
}

export async function createDisplay(
  display: Omit<DisplayDevice, "id">
): Promise<DisplayDevice> {
  return apiFetch<DisplayDevice>("/settings/displays", {
    method: "POST",
    body: display,
  });
}

export async function updateDisplay(
  id: number,
  display: Partial<DisplayDevice>
): Promise<void> {
  await apiFetch<void>(`/settings/displays/${id}`, {
    method: "PUT",
    body: display,
  });
}

export async function deleteDisplay(id: number): Promise<void> {
  await apiFetch<void>(`/settings/displays/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Business Rules (Configurable Constants)
// ============================================================================

export interface BusinessRule {
  category: string;
  rules: Record<string, unknown>;
}

export async function getAllBusinessRules(): Promise<BusinessRule[]> {
  return apiFetch<BusinessRule[]>("/settings/business-rules");
}

export async function getBusinessRule(category: string): Promise<BusinessRule> {
  return apiFetch<BusinessRule>(`/settings/business-rules/${category}`);
}

export async function upsertBusinessRule(
  category: string,
  rules: Record<string, unknown>
): Promise<void> {
  await apiFetch<void>(`/settings/business-rules/${category}`, {
    method: "PUT",
    body: rules,
  });
}

// ============================================================================
// Helper: Fetch all business rules as a single map
// ============================================================================

export async function fetchAllBusinessRules(): Promise<
  Record<string, Record<string, unknown>>
> {
  const rules = await getAllBusinessRules();
  const result: Record<string, Record<string, unknown>> = {};
  for (const rule of rules) {
    result[rule.category] = rule.rules;
  }
  return result;
}

// ============================================================================
// Settings API object (for consistency with other API modules)
// ============================================================================

export async function uploadBrandingFile(
  kind: "logo" | "favicon",
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<{ url: string }>(`/settings/${kind}`, {
    method: "POST",
    body: formData,
  });
}

export const settingsApi = {
  getSettings,
  updateSettings,
  uploadLogo: (file: File) => uploadBrandingFile("logo", file),
  uploadFavicon: (file: File) => uploadBrandingFile("favicon", file),
  getAudioSchedules,
  createAudioSchedule,
  updateAudioSchedule,
  deleteAudioSchedule,
  getDisplays,
  createDisplay,
  updateDisplay,
  deleteDisplay,
  getAllBusinessRules,
  getBusinessRule,
  upsertBusinessRule,
  fetchAllBusinessRules,
};

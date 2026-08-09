/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/fingerprint.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { FingerprintDevice } from "./types";

export const fingerprintApi = {
  /** Fetch fingerprint devices list */
  async getDevices(): Promise<FingerprintDevice[]> {
    return apiFetch<FingerprintDevice[]>("/fingerprint/devices", {
      method: "GET",
    });
  },

  /** Create fingerprint device */
  async createDevice(
    data: Partial<FingerprintDevice>
  ): Promise<FingerprintDevice> {
    return apiFetch<FingerprintDevice>("/fingerprint/devices", {
      method: "POST",
      body: data,
    });
  },

  /** Update fingerprint device */
  async updateDevice(
    id: number,
    data: Partial<FingerprintDevice>
  ): Promise<FingerprintDevice> {
    return apiFetch<FingerprintDevice>(`/fingerprint/devices/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete fingerprint device */
  async deleteDevice(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/fingerprint/devices/${id}`, {
      method: "DELETE",
    });
  },

  /** Trigger manual fingerprint sync */
  async syncNow(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/fingerprint/sync", {
      method: "POST",
    });
  },
};

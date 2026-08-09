/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/fleet.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type {
  FleetAllocResponse,
  FleetSetting,
  Unit,
  UnitDb,
  UnitHist,
  UnitStatus,
} from "./types";

export const fleetApi = {
  /** Fetch fleet settings list */
  async getFleetSettings(): Promise<FleetSetting[]> {
    return apiFetch<FleetSetting[]>("/fleet/settings", {
      method: "GET",
    });
  },

  /** Create fleet setting */
  async createFleetSetting(data: Partial<FleetSetting>): Promise<FleetSetting> {
    return apiFetch<FleetSetting>("/fleet/settings", {
      method: "POST",
      body: data,
    });
  },

  /** Update fleet setting */
  async updateFleetSetting(
    id: number,
    data: Partial<FleetSetting>
  ): Promise<FleetSetting> {
    return apiFetch<FleetSetting>(`/fleet/settings/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete fleet setting */
  async deleteFleetSetting(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/fleet/settings/${id}`, {
      method: "DELETE",
    });
  },

  /** Fetch allocations map */
  async getAllocations(dates?: string[]): Promise<FleetAllocResponse> {
    return apiFetch<FleetAllocResponse>("/fleet/allocations", {
      method: "GET",
      params: { dates: dates?.join(",") },
    });
  },

  /** Auto allocate fleet operators */
  async autoAllocate(payload: {
    date: string;
    shift: string;
    fleetId?: number;
  }): Promise<FleetAllocResponse> {
    return apiFetch<FleetAllocResponse>("/fleet/allocations/auto", {
      method: "POST",
      body: payload,
    });
  },

  /** Get unit statuses */
  async getUnitStatuses(): Promise<Unit[]> {
    return apiFetch<Unit[]>("/units/status", {
      method: "GET",
    });
  },

  /** Update unit status */
  async updateUnitStatus(
    code: string,
    status: UnitStatus,
    note?: string
  ): Promise<Unit> {
    return apiFetch<Unit>(`/units/${code}/status`, {
      method: "PUT",
      body: { status, note },
    });
  },

  /** Report breakdown for a unit */
  async reportBreakdown(
    code: string,
    payload: { what: string; why: string; loc?: string }
  ): Promise<Unit> {
    return apiFetch<Unit>(`/units/${code}/status-report`, {
      method: "POST",
      body: payload,
    });
  },

  /** Get unit status history */
  async getUnitHistory(code: string): Promise<UnitHist[]> {
    return apiFetch<UnitHist[]>(`/units/${code}/history`, {
      method: "GET",
    });
  },

  /** Get unit database */
  async getUnitDB(): Promise<UnitDb[]> {
    return apiFetch<UnitDb[]>("/units/db", {
      method: "GET",
    });
  },

  /** Create unit in DB */
  async createUnitDB(data: Partial<UnitDb>): Promise<UnitDb> {
    return apiFetch<UnitDb>("/units/db", {
      method: "POST",
      body: data,
    });
  },

  /** Update unit in DB */
  async updateUnitDB(code: string, data: Partial<UnitDb>): Promise<UnitDb> {
    return apiFetch<UnitDb>("/units/db", {
      method: "PUT",
      body: { ...data, code },
    });
  },

  /** Delete unit in DB */
  async deleteUnitDB(code: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/units/db", {
      method: "DELETE",
      params: { code },
    });
  },

  /** Import unit DB file */
  async importUnitDB(formData: FormData): Promise<{ imported: number }> {
    return apiFetch<{ imported: number }>("/units/db/import", {
      method: "POST",
      body: formData,
    });
  },
};

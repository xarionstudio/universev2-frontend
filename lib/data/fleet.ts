/* ---------- Dynamic business rules (from backend) ---------- */

import { useFleetConfig } from "@/components/providers/business-rules";

/* Setting fleet — formasi: digger (leader) + unit OHT (maks. 13) + lokasi kerja
   + bus default. Diambil dari backend API GET /api/fleet/settings. */

/* Fallback value — gunakan useFleetConfig() untuk dynamic value dari backend */
export const FLEET_MAX_UNITS = 13;

/**
 * Hook untuk mendapatkan fleet configuration dinamis dari backend.
 * Fallback ke hardcoded values jika backend error.
 *
 * @example
 * const { maxUnits } = useFleetConfig();
 */
export { useFleetConfig } from "@/components/providers/business-rules";

export type Fleet = {
  id: string;
  digger: string;
  loc: string;
  bus: string;
  units: string[];
  active: boolean;
};

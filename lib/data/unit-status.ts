/* Status operasional unit (layar Status Unit) — diambil dari backend API
   GET /api/units/status. */
export type UnitStatus = "ready" | "breakdown" | "standby";

export type UnitHist = [string, string, string, UnitStatus];

export type Unit = {
  code: string;
  type: string;
  status: UnitStatus;
  loc: string;
  upd: string;
  hist: UnitHist[];
};

export const statusDotColor: Record<UnitStatus, string> = {
  ready: "var(--badge-success-text)",
  breakdown: "var(--color-danger-text)",
  standby: "var(--badge-warning-text)",
};

import { unitsDb } from "./units-db";

/* Status operasional unit (layar Status Unit) — DITURUNKAN dari master unit
   terpusat (units-db.ts, hasil generate equipment.json) supaya sinkron dengan
   Database Unit, Fleet, dan display TV. Riwayat: [kapan, apa, alasan, jenis] */
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

/* urutan papan: breakdown paling atas — dipakai juga adapter API */
export const statusRank: Record<UnitStatus, number> = {
  breakdown: 0,
  standby: 1,
  ready: 2,
};

export const initialUnits: Unit[] = unitsDb
  .filter((u) => u.active)
  .map((u, i): Unit => {
    const status: UnitStatus = u.breakdown
      ? "breakdown"
      : u.standby
        ? "standby"
        : "ready";
    /* menit deterministik per unit agar jam laporan terlihat wajar */
    const mm = String((i * 7) % 60).padStart(2, "0");
    const type = `${u.egi || "—"} · ${u.product}`;
    if (status === "breakdown")
      return {
        code: u.code,
        type,
        status,
        loc: u.loc,
        upd: `04:${mm} — dilaporkan rusak, menunggu perbaikan`,
        hist: [
          [
            `12 Jul 04:${mm}`,
            "Breakdown",
            "Dilaporkan rusak — masuk antrean workshop",
            "breakdown",
          ],
          [`05 Jul 06:${mm}`, "Ready", "Checklist harian ok", "ready"],
        ],
      };
    if (status === "standby")
      return {
        code: u.code,
        type,
        status,
        loc: u.loc,
        upd: `06:${mm} — cadangan shift pagi`,
        hist: [
          [`12 Jul 06:${mm}`, "Standby", "Cadangan shift pagi", "standby"],
          [`10 Jul 05:${mm}`, "Ready", "Checklist harian ok", "ready"],
        ],
      };
    return {
      code: u.code,
      type,
      status,
      loc: u.loc,
      upd: `05:${mm} — checklist ok`,
      hist: [[`13 Jul 05:${mm}`, "Ready", "Checklist harian ok", "ready"]],
    };
  })
  .sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      a.code.localeCompare(b.code)
  );

export const statusDotColor: Record<UnitStatus, string> = {
  ready: "var(--badge-success-text)",
  breakdown: "var(--color-danger-text)",
  standby: "var(--badge-warning-text)",
};

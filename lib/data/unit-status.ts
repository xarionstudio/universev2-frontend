/* Status operasional unit (layar Status Unit) — riwayat: [kapan, apa, alasan, jenis] */
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

export const initialUnits: Unit[] = [
  {
    code: "DT-114",
    type: "Dump Truck 777D",
    status: "breakdown",
    loc: "Pit utara",
    upd: "04:12 — hidrolik bocor",
    hist: [
      [
        "11 Jul 04:12",
        "Breakdown",
        "Hidrolik bocor — dilaporkan operator shift malam",
        "breakdown",
      ],
      ["08 Jul 06:00", "Ready", "Servis 250 jam selesai", "ready"],
      ["06 Jul 13:40", "Standby", "Menunggu servis terjadwal", "standby"],
    ],
  },
  {
    code: "DT-108",
    type: "Dump Truck 777D",
    status: "ready",
    loc: "Pit utara",
    upd: "05:58 — checklist ok",
    hist: [
      ["11 Jul 05:58", "Ready", "Checklist harian ok", "ready"],
      ["10 Jul 05:55", "Ready", "Checklist harian ok", "ready"],
    ],
  },
  {
    code: "EX-07",
    type: "Excavator PC2000",
    status: "breakdown",
    loc: "Pit selatan",
    upd: "kemarin 22:15 — track putus",
    hist: [
      ["10 Jul 22:15", "Breakdown", "Track putus — butuh crane", "breakdown"],
      ["05 Jul 06:00", "Ready", "Perbaikan minor selesai", "ready"],
    ],
  },
  {
    code: "EX-03",
    type: "Excavator PC1250",
    status: "ready",
    loc: "Pit selatan",
    upd: "05:52 — checklist ok",
    hist: [["11 Jul 05:52", "Ready", "Checklist harian ok", "ready"]],
  },
  {
    code: "GR-02",
    type: "Grader 24M",
    status: "breakdown",
    loc: "Workshop",
    upd: "2 hari — tunggu spare part",
    hist: [
      [
        "09 Jul 08:30",
        "Breakdown",
        "Transmisi — menunggu spare part dari Balikpapan",
        "breakdown",
      ],
      ["01 Jul 06:00", "Ready", "—", "ready"],
    ],
  },
  {
    code: "WT-05",
    type: "Water Truck 773E",
    status: "standby",
    loc: "Workshop",
    upd: "06:10 — cadangan shift pagi",
    hist: [
      ["11 Jul 06:10", "Standby", "Cadangan shift pagi", "standby"],
      ["10 Jul 06:00", "Ready", "—", "ready"],
    ],
  },
  {
    code: "DT-121",
    type: "Dump Truck 785C",
    status: "ready",
    loc: "Pit utara",
    upd: "05:47 — checklist ok",
    hist: [["11 Jul 05:47", "Ready", "Checklist harian ok", "ready"]],
  },
];

export const statusDotColor: Record<UnitStatus, string> = {
  ready: "var(--badge-success-text)",
  breakdown: "var(--color-danger-text)",
  standby: "var(--badge-warning-text)",
};

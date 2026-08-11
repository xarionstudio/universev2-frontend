/* Data pengaturan: audio kiosk terjadwal + display kiosk (admin)
   Diambil dari backend API GET /api/settings/audio dan GET /api/settings/displays. */
export type Audio = {
  id: string;
  title: string;
  when: string;
  freq: "sekali" | "harian" | "perjam" | "per30";
  file: string;
  active: boolean;
  displays: ("att" | "fleet" | "ftw" | "finger")[];
};

export type DisplayKind = "att" | "fleet" | "ftw" | "finger";

export type Display = {
  id: string;
  name: string;
  loc: string;
  content: DisplayKind;
  /* display fleet terikat satu formasi dari Setting Fleet — nama mengikuti fleet */
  fleetId?: string;
  runtext: string;
  online: boolean;
  hb: string;
  active: boolean;
};

/* Data pengaturan: audio kiosk terjadwal + display kiosk (admin) */
export type Audio = {
  id: string;
  title: string;
  when: string;
  freq: "sekali" | "harian" | "perjam" | "per30";
  file: string;
  active: boolean;
  displays: ("att" | "fleet" | "ftw" | "finger")[];
};

export const initialAudios: Audio[] = [
  {
    id: "au1",
    title: "Pengumuman P5M",
    when: "05:45",
    freq: "harian",
    file: "p5m_reminder.mp3",
    active: true,
    displays: ["att", "fleet"],
  },
  {
    id: "au2",
    title: "Alarm fatigue check",
    when: "13:00",
    freq: "perjam",
    file: "fatigue_alert.mp3",
    active: true,
    displays: ["ftw"],
  },
  {
    id: "au3",
    title: "Pergantian shift",
    when: "17:45",
    freq: "harian",
    file: "shift_change.mp3",
    active: false,
    displays: ["att", "fleet", "ftw", "finger"],
  },
];

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

export const initialDspAtt: Display[] = [
  {
    id: "DSP-A01",
    name: "TV Gate Utara",
    loc: "Gate utara",
    content: "att",
    runtext:
      "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
    online: true,
    hb: "3 dtk lalu",
    active: true,
  },
  {
    id: "DSP-A02",
    name: "TV Mess 31",
    loc: "Lobi mess",
    content: "att",
    runtext: "Wajib P2H sebelum mengoperasikan unit.",
    online: true,
    hb: "12 dtk lalu",
    active: true,
  },
  {
    id: "DSP-A03",
    name: "TV Ruang P5M",
    loc: "Kantor SDI",
    content: "ftw",
    runtext: "Rapat P5M setiap pergantian shift di front masing-masing.",
    online: false,
    hb: "26 mnt lalu",
    active: true,
  },
  {
    id: "DSP-A04",
    name: "TV Pos Fingerprint",
    loc: "Gate selatan",
    content: "finger",
    runtext: "Wajib P2H sebelum mengoperasikan unit.",
    online: true,
    hb: "5 dtk lalu",
    active: false,
  },
];

export const initialDspFleet: Display[] = [
  {
    id: "DSP-F01",
    name: "Fleet EX7001",
    loc: "Workshop Plant",
    content: "fleet",
    fleetId: "fl-EX7001",
    runtext: "Wajib P2H sebelum mengoperasikan unit.",
    online: true,
    hb: "2 dtk lalu",
    active: true,
  },
  {
    id: "DSP-F02",
    name: "Fleet EX7007",
    loc: "Kantor Operation",
    content: "fleet",
    fleetId: "fl-EX7007",
    runtext:
      "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
    online: true,
    hb: "8 dtk lalu",
    active: true,
  },
  {
    id: "DSP-F03",
    name: "Fleet EX8001",
    loc: "KM 31",
    content: "fleet",
    fleetId: "fl-EX8001",
    runtext: "Musim hujan: waspadai jalan licin di ramp Pit Tempudo.",
    online: false,
    hb: "1 j lalu",
    active: true,
  },
];

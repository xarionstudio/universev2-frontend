/* Data pengaturan: audio kiosk terjadwal + display kiosk (admin) */
export type Audio = {
  id: string;
  title: string;
  when: string;
  freq: "sekali" | "harian" | "perjam" | "per30";
  file: string;
  active: boolean;
  /* DisplayKind, bukan daftar literal sendiri: sebelumnya union ini ditulis
     ulang di sini, jadi setiap layar jenis baru diam-diam tidak bisa dipilih
     sebagai sasaran audio sampai ada yang ingat menyalinnya ke sini juga. */
  displays: DisplayKind[];
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

export type DisplayKind = "att" | "fleet" | "ftw" | "finger" | "monitor";

export type Display = {
  id: string;
  name: string;
  loc: string;
  content: DisplayKind;
  /* display fleet terikat satu formasi dari Setting Fleet — nama mengikuti fleet */
  fleetId?: string;
  /* display monitor menampung BANYAK formasi dan menampilkannya bergantian.
     Urutan array = urutan giliran di layar, jadi admin bisa menaikkan fleet
     yang paling sering ditanya ke posisi pertama. */
  fleetIds?: string[];
  /* detik per giliran display monitor (default 10) */
  rotateSec?: number;
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

/* Satu tayangan layar monitor = 4 fleet (kisi 2x2), dan maksimal 3 tayangan
   bergantian. Batas 12 bukan angka sembarang: kuadran di kanvas 1920x1080
   berukuran 892x398 px, cukup untuk formasi terbesar (14 unit) sebagai baris
   teks 17px. Menambah fleet per tayangan berarti mengecilkan huruf di bawah
   ambang keterbacaan; menambah tayangan berarti fleet pertama baru muncul
   lagi setelah lebih dari setengah menit. */
export const MONITOR_PER_PAGE = 4;
export const MONITOR_MAX_PAGES = 3;
export const MONITOR_MAX_FLEETS = MONITOR_PER_PAGE * MONITOR_MAX_PAGES;

/* Display monitor — satu layar memutar beberapa formasi fleet bergantian.
   Bedanya dengan display fleet: display fleet mengunci SATU formasi (untuk TV
   di pos fleet itu sendiri), sedangkan monitor dipasang di tempat berkumpul
   (mess, kantin, kantor) tempat kru banyak fleet lewat, sehingga satu layar
   harus melayani semuanya. */
export const initialDspMonitor: Display[] = [
  {
    id: "DSP-M01",
    name: "Display Monitor 1",
    loc: "Mess 31 — ruang makan",
    content: "monitor",
    /* terisi penuh 12 fleet = 3 tayangan */
    fleetIds: [
      "fl-EX5002",
      "fl-EX5003",
      "fl-EX5005",
      "fl-EX5006",
      "fl-EX6001",
      "fl-EX6002",
      "fl-EX6003",
      "fl-EX7001",
      "fl-EX7002",
      "fl-EX7003",
      "fl-EX7004",
      "fl-EX7005",
    ],
    rotateSec: 10,
    runtext: "Wajib P2H sebelum mengoperasikan unit.",
    online: true,
    hb: "4 dtk lalu",
    active: true,
  },
  {
    id: "DSP-M02",
    name: "Display Monitor 2",
    loc: "Kantor Operation — lobi",
    content: "monitor",
    /* 6 fleet = 2 tayangan; tayangan kedua menyisakan 2 slot kosong —
       sengaja, supaya perilaku placeholder terlihat langsung tanpa perlu
       menyetel apa pun */
    fleetIds: [
      "fl-EX7006",
      "fl-EX7007",
      "fl-EX7008",
      "fl-EX7009",
      "fl-EX7010",
      "fl-EX8001",
    ],
    rotateSec: 10,
    runtext:
      "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
    online: true,
    hb: "6 dtk lalu",
    active: true,
  },
];

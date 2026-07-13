import type { Lang } from "@/lib/i18n";

/* ===== Data roster (list per bulan) ===== */
export type RosterMeta = {
  key: string;
  label: string;
  month: string;
  file: string;
  emp: string;
  rows: string;
  by: string;
  date: string;
  dateISO: string;
  status: "aktif" | "arsip";
};

export function rosterMeta(lang: Lang): RosterMeta[] {
  const en = lang === "en";
  return [
    {
      key: "jul",
      label: "Juli 2026",
      month: "2026-07",
      file: "roster_juli_2026.xlsx",
      emp: "247",
      rows: en ? "2,140" : "2.140",
      by: "First Angel",
      date: "01 Jul 2026",
      dateISO: new Date().toISOString().slice(0, 10),
      status: "aktif",
    },
    {
      key: "jun",
      label: "Juni 2026",
      month: "2026-06",
      file: "roster_juni_2026.xlsx",
      emp: "243",
      rows: en ? "2,065" : "2.065",
      by: "First Angel",
      date: "01 Jun 2026",
      dateISO: "2026-06-30",
      status: "arsip",
    },
    {
      key: "mei",
      label: "Mei 2026",
      month: "2026-05",
      file: "roster_mei_2026.xlsx",
      emp: "241",
      rows: en ? "2,098" : "2.098",
      by: "Rahmat Hidayat",
      date: "02 Mei 2026",
      dateISO: "2026-05-31",
      status: "arsip",
    },
  ];
}

/* ===== Legend kode roster ===== */
export type LegendGroup = { label: string; codes: { k: string; v: string }[] };

export function legendGroupsFor(lang: Lang): LegendGroup[] {
  const en = lang === "en";
  return [
    {
      label: en ? "Shifts & attendance" : "Shift & kehadiran",
      codes: [
        { k: "D", v: en ? "Day shift" : "Day shift" },
        { k: "N", v: en ? "Night shift" : "Night shift" },
        { k: "R", v: en ? "Regular" : "Reguler" },
        { k: "STB", v: "Standby" },
        { k: "OFF", v: "OFF" },
      ],
    },
    {
      label: en ? "Leave & permits" : "Cuti & izin",
      codes: [
        { k: "CR", v: en ? "Roster leave" : "Cuti roster" },
        { k: "AL", v: "Annual leave" },
        { k: "LWP", v: en ? "Paid leave" : "Izin dengan upah" },
        { k: "LWOP", v: en ? "Unpaid leave" : "Izin tanpa upah" },
        { k: "PH", v: "Public holiday" },
        { k: "PHD", v: en ? "Public holiday (day)" : "Public holiday siang" },
      ],
    },
    {
      label: en ? "Sickness & absence" : "Sakit & ketidakhadiran",
      codes: [
        { k: "S", v: en ? "Sick" : "Sakit" },
        { k: "A", v: en ? "Alpha / no notice" : "Alpha" },
      ],
    },
    {
      label: en ? "Medical & quarantine" : "Medis & karantina",
      codes: [
        { k: "MCU", v: "Medical check up" },
        { k: "MCR", v: en ? "Regular MCU" : "Reguler MCU" },
        { k: "MCUF", v: en ? "MCU follow-up" : "Follow up MCU" },
        { k: "ISM", v: en ? "Self-isolation" : "Isolasi mandiri" },
        { k: "OBC", v: en ? "COVID observation" : "Observasi COVID" },
        { k: "KRT", v: en ? "Quarantine" : "Karantina" },
      ],
    },
    {
      label: en ? "Assignment & training" : "Tugas & training",
      codes: [
        { k: "TGS", v: en ? "Assignment" : "Tugas" },
        { k: "DNS", v: en ? "Official duty" : "Dinas" },
        { k: "TRV", v: "Travel" },
        { k: "TR", v: en ? "Off-site training" : "Training di luar site" },
        { k: "TRS", v: en ? "On-site training" : "Training onsite" },
        { k: "IN", v: en ? "Induction" : "Induksi" },
      ],
    },
    {
      label: en ? "Employment status" : "Status kepegawaian",
      codes: [
        { k: "TERM", v: "Termination" },
        { k: "EOC", v: en ? "Contract ended" : "Kontrak berakhir" },
        { k: "RSG", v: "Resign" },
      ],
    },
  ];
}

/* ===== Baris error hasil validasi upload ===== */
export type UpError = {
  row: string;
  nik: string;
  emp: string;
  issue: string;
  badgeVariant: "danger" | "warning";
  badge: string;
};

export function upErrorRows(lang: Lang): UpError[] {
  const en = lang === "en";
  return [
    {
      row: "214",
      nik: "503264999",
      emp: "—",
      issue: en
        ? "NIK not found in employee data"
        : "NIK tidak terdaftar di data karyawan",
      badgeVariant: "danger",
      badge: "Error",
    },
    {
      row: "387",
      nik: "503264135",
      emp: "Budi Santoso",
      issue: en
        ? 'Code "D12" on 14 Jul — not a known roster code'
        : 'Kode "D12" pada 14 Jul — bukan kode roster yang dikenal',
      badgeVariant: "danger",
      badge: "Error",
    },
    {
      row: "512",
      nik: "503264140",
      emp: "Rina Marlina",
      issue: en
        ? "Day 31 empty — every day must have a code"
        : "Tanggal 31 kosong — semua hari wajib berkode",
      badgeVariant: "danger",
      badge: "Error",
    },
    {
      row: "890",
      nik: "503264137",
      emp: "Andi Prasetyo",
      issue: en
        ? 'NIK is not numeric ("5O3264137" — letter O)'
        : 'Format NIK bukan angka ("5O3264137" — huruf O)',
      badgeVariant: "danger",
      badge: "Error",
    },
    {
      row: en ? "1,204" : "1.204",
      nik: "503264142",
      emp: "Maya Sari",
      issue: en
        ? "N consecutive > 14 days — violates roster rules"
        : "N berurutan > 14 hari — melanggar aturan roster",
      badgeVariant: "danger",
      badge: "Error",
    },
    {
      row: "640 & 641",
      nik: "503264134",
      emp: "Rahmat Hidayat",
      issue: en
        ? "Duplicate rows — row 641 is used"
        : "Baris ganda — baris 641 yang dipakai",
      badgeVariant: "warning",
      badge: en ? "Duplicate" : "Duplikat",
    },
  ];
}

/* ===== Preview file roster (matriks per tanggal) ===== */
export type UpPreview = {
  days: string[];
  rows: { nik: string; name: string; codes: { v: string; color: string }[] }[];
};

export function upPreviewData(): UpPreview {
  const EMP: [string, string, string[]][] = [
    [
      "503264133",
      "First Angel Paustine",
      ["D", "D", "D", "D", "D", "OFF", "OFF"],
    ],
    ["503264134", "Rahmat Hidayat", ["R", "R", "R", "R", "R", "OFF", "OFF"]],
    ["503264135", "Budi Santoso", ["D", "D", "OFF", "D", "D", "D", "OFF"]],
    ["503264136", "Siti Nurhaliza", ["D", "D", "OFF", "D", "D", "D", "OFF"]],
    ["503264137", "Andi Prasetyo", ["D", "D", "D", "OFF", "D", "D", "OFF"]],
    ["503264138", "Dewi Lestari", ["R", "R", "R", "R", "OFF", "R", "OFF"]],
    ["503264139", "Joko Widodo S.", ["D", "D", "D", "OFF", "OFF", "D", "STB"]],
    ["503264140", "Rina Marlina", ["CR", "CR", "CR", "CR", "CR", "OFF", "OFF"]],
    ["503264141", "Agus Salim", ["D", "OFF", "D", "D", "TRS", "D", "OFF"]],
    ["503264142", "Maya Sari", ["N", "N", "N", "N", "OFF", "OFF", "N"]],
  ];
  // sisipan realistis: sakit, alpha & MCU di tengah bulan
  const OVERRIDE: Record<string, Record<number, string>> = {
    "503264135": { 14: "S" },
    "503264141": { 9: "A" },
    "503264138": { 21: "MCU" },
  };
  function colorOf(c: string) {
    if (["OFF", "CR", "AL", "LWP", "LWOP", "PH", "PHD"].includes(c))
      return "var(--text-tertiary)";
    if (["S", "A", "ISM", "OBC", "KRT", "TERM", "RSG", "EOC"].includes(c))
      return "var(--color-danger-text)";
    if (c === "N") return "var(--color-primary-bright)";
    return "var(--text-secondary)";
  }
  const days: string[] = [];
  for (let d = 1; d <= 31; d++) days.push(`${d < 10 ? "0" : ""}${d} Jul`);
  const rows = EMP.map((e) => {
    const codes = [];
    for (let d = 1; d <= 31; d++) {
      let c = e[2][(d - 1) % 7];
      if (OVERRIDE[e[0]]?.[d]) c = OVERRIDE[e[0]][d];
      codes.push({ v: c, color: colorOf(c) });
    }
    return { nik: e[0], name: e[1], codes };
  });
  return { days, rows };
}

/* ===== Kode pilihan form revisi ===== */
export function revCodeList(lang: Lang): string[] {
  const en = lang === "en";
  return [
    "D — Day shift",
    "N — Night shift",
    `R — ${en ? "Regular" : "Reguler"}`,
    "STB — Standby",
    "OFF — OFF",
    `CR — ${en ? "Roster leave" : "Cuti roster"}`,
    "AL — Annual leave",
    `S — ${en ? "Sick" : "Sakit"}`,
    `A — ${en ? "Alpha / no notice" : "Alpha"}`,
    `LWP — ${en ? "Paid leave" : "Izin dengan upah"}`,
    `LWOP — ${en ? "Unpaid leave" : "Izin tanpa upah"}`,
  ];
}

/* ===== 3 · approval ===== */
export type ApRow = {
  sid: string;
  name: string;
  nik: string;
  whatId: string;
  whatEn: string;
  whenId: string;
  whenEn: string;
  status: "pending" | "approved" | "rejected";
  byId?: string;
  byEn?: string;
};

export function apInitialRows(): ApRow[] {
  return [
    {
      sid: "REV-0711-02",
      name: "First Angel Paustine",
      nik: "503264133",
      whatId: "10 Jul — check-in 06:02 → 05:45 · antre fingerprint",
      whatEn: "10 Jul — check-in 06:02 → 05:45 · fingerprint queue",
      whenId: "hari ini 07:12",
      whenEn: "today 07:12",
      status: "pending",
    },
    {
      sid: "REV-0711-02",
      name: "Agus Salim",
      nik: "503264141",
      whatId: "09 Jul — check-out kosong → 17:30 · alat rusak di pit",
      whatEn: "09 Jul — missing check-out → 17:30 · broken device at the pit",
      whenId: "hari ini 07:12",
      whenEn: "today 07:12",
      status: "pending",
    },
    {
      sid: "REV-0711-02",
      name: "Siti Nurhaliza",
      nik: "503264136",
      whatId: "08 Jul — kode A → S · surat dokter menyusul",
      whatEn: "08 Jul — code A → S · doctor's note to follow",
      whenId: "hari ini 07:12",
      whenEn: "today 07:12",
      status: "pending",
    },
    {
      sid: "REV-0709-05",
      name: "Maya Sari",
      nik: "503264142",
      whatId: "07 Jul — kode D → OFF · tukar shift disetujui spv",
      whatEn: "07 Jul — code D → OFF · shift swap approved by spv",
      whenId: "2 hari lalu",
      whenEn: "2 days ago",
      status: "pending",
    },
    {
      sid: "REV-0708-03",
      name: "Rahmat Hidayat",
      nik: "503264134",
      whatId: "06 Jul — check-in 06:15 → 06:00 · mesin offline",
      whatEn: "06 Jul — check-in 06:15 → 06:00 · machine offline",
      whenId: "3 hari lalu",
      whenEn: "3 days ago",
      status: "approved",
      byId: "First Angel · 09 Jul 08:20",
      byEn: "First Angel · 09 Jul 08:20",
    },
    {
      sid: "REV-0707-01",
      name: "Budi Santoso",
      nik: "503264135",
      whatId: "05 Jul — kode A → LWP · tanpa bukti pendukung",
      whatEn: "05 Jul — code A → LWP · no supporting evidence",
      whenId: "4 hari lalu",
      whenEn: "4 days ago",
      status: "rejected",
      byId: "First Angel · 08 Jul 10:02 — bukti tidak sesuai",
      byEn: "First Angel · 08 Jul 10:02 — evidence mismatch",
    },
  ];
}

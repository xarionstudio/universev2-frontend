import type { Lang } from "@/lib/i18n"

/* ===== Data roster (list per bulan) ===== */
export type RosterMeta = {
  key: string
  label: string
  month: string
  file: string
  emp: string
  rows: string
  by: string
  date: string
  dateISO: string
  status: "aktif" | "arsip"
}

export function rosterMeta(lang: Lang): RosterMeta[] {
  const en = lang === "en"
  return [
    { key: "jul", label: "Juli 2026", month: "2026-07", file: "roster_juli_2026.xlsx", emp: "247", rows: en ? "2,140" : "2.140", by: "First Angel", date: "01 Jul 2026", dateISO: new Date().toISOString().slice(0, 10), status: "aktif" },
    { key: "jun", label: "Juni 2026", month: "2026-06", file: "roster_juni_2026.xlsx", emp: "243", rows: en ? "2,065" : "2.065", by: "First Angel", date: "01 Jun 2026", dateISO: "2026-06-30", status: "arsip" },
    { key: "mei", label: "Mei 2026", month: "2026-05", file: "roster_mei_2026.xlsx", emp: "241", rows: en ? "2,098" : "2.098", by: "Rahmat Hidayat", date: "02 Mei 2026", dateISO: "2026-05-31", status: "arsip" },
  ]
}

/* ===== Legend kode roster ===== */
export type LegendGroup = { label: string; codes: { k: string; v: string }[] }

export function legendGroupsFor(lang: Lang): LegendGroup[] {
  const en = lang === "en"
  return [
    { label: en ? "Work shifts" : "Shift kerja", codes: [
      { k: "D", v: en ? "Day shift" : "Shift siang" }, { k: "D7", v: en ? "Day 7 hours" : "Siang 7 jam" },
      { k: "D8", v: en ? "Day 8 hours" : "Siang 8 jam" }, { k: "D10", v: en ? "Day 10 hours" : "Siang 10 jam" },
      { k: "D12", v: en ? "Day 12 hours" : "Siang 12 jam" }, { k: "N", v: en ? "Night shift" : "Shift malam" },
      { k: "N7", v: en ? "Night 7 hours" : "Malam 7 jam" }, { k: "N8", v: en ? "Night 8 hours" : "Malam 8 jam" },
      { k: "N10", v: en ? "Night 10 hours" : "Malam 10 jam" }, { k: "N12", v: en ? "Night 12 hours" : "Malam 12 jam" },
    ] },
    { label: en ? "Leave & rest" : "Cuti & istirahat", codes: [
      { k: "OFF", v: en ? "Roster day off" : "Hari libur roster" }, { k: "CR", v: en ? "Roster leave" : "Cuti roster" },
      { k: "AL", v: "Annual leave" }, { k: "CB", v: en ? "Long-service leave" : "Cuti besar" },
      { k: "CH", v: en ? "Maternity leave" : "Cuti hamil" },
    ] },
    { label: en ? "Absence" : "Ketidakhadiran", codes: [
      { k: "S", v: en ? "Sick" : "Sakit" }, { k: "SD", v: en ? "Sick + doctor's note" : "Sakit + surat dokter" },
      { k: "I", v: en ? "Permitted absence" : "Izin" }, { k: "A", v: en ? "Absent without notice" : "Alpha / tanpa kabar" },
    ] },
    { label: en ? "Other" : "Lainnya", codes: [
      { k: "TR", v: "Training" }, { k: "DL", v: en ? "Field assignment" : "Dinas luar" },
      { k: "ST", v: "Standby" }, { k: "M", v: "Meeting" }, { k: "MCU", v: "Medical check-up" },
      { k: "MT", v: "Medical treatment" }, { k: "EM", v: "Emergency leave" },
      { k: "PH", v: "Public holiday" }, { k: "RD", v: "Rest day" },
    ] },
  ]
}

/* ===== Baris error hasil validasi upload ===== */
export type UpError = {
  row: string
  nik: string
  emp: string
  issue: string
  badgeVariant: "danger" | "warning"
  badge: string
}

export function upErrorRows(lang: Lang): UpError[] {
  const en = lang === "en"
  return [
    { row: "214", nik: "503264999", emp: "—", issue: en ? "NIK not found in employee data" : "NIK tidak terdaftar di data karyawan", badgeVariant: "danger", badge: "Error" },
    { row: "387", nik: "503264135", emp: "Budi Santoso", issue: en ? 'Code "XX" on 14 Jul — not a known roster code' : 'Kode "XX" pada 14 Jul — bukan kode roster yang dikenal', badgeVariant: "danger", badge: "Error" },
    { row: "512", nik: "503264140", emp: "Rina Marlina", issue: en ? "Day 31 empty — every day must have a code" : "Tanggal 31 kosong — semua hari wajib berkode", badgeVariant: "danger", badge: "Error" },
    { row: "890", nik: "503264137", emp: "Andi Prasetyo", issue: en ? 'NIK is not numeric ("5O3264137" — letter O)' : 'Format NIK bukan angka ("5O3264137" — huruf O)', badgeVariant: "danger", badge: "Error" },
    { row: en ? "1,204" : "1.204", nik: "503264142", emp: "Maya Sari", issue: en ? "N12 consecutive > 14 days — violates roster rules" : "N12 berurutan > 14 hari — melanggar aturan roster", badgeVariant: "danger", badge: "Error" },
    { row: "640 & 641", nik: "503264134", emp: "Rahmat Hidayat", issue: en ? "Duplicate rows — row 641 is used" : "Baris ganda — baris 641 yang dipakai", badgeVariant: "warning", badge: en ? "Duplicate" : "Duplikat" },
  ]
}

/* ===== Preview file roster (matriks per tanggal) ===== */
export type UpPreview = {
  days: string[]
  rows: { nik: string; name: string; codes: { v: string; color: string }[] }[]
}

export function upPreviewData(): UpPreview {
  const EMP: [string, string, string[]][] = [
    ["503264133", "First Angel Paustine", ["D12", "D12", "D12", "D12", "D12", "OFF", "OFF"]],
    ["503264134", "Rahmat Hidayat", ["D8", "D8", "D8", "D8", "D8", "OFF", "OFF"]],
    ["503264135", "Budi Santoso", ["D8", "D8", "OFF", "D8", "D8", "D8", "OFF"]],
    ["503264136", "Siti Nurhaliza", ["D12", "D12", "OFF", "D12", "D12", "D12", "OFF"]],
    ["503264137", "Andi Prasetyo", ["D10", "D10", "D10", "OFF", "D10", "D10", "OFF"]],
    ["503264138", "Dewi Lestari", ["D8", "D8", "D8", "D8", "OFF", "D8", "OFF"]],
    ["503264139", "Joko Widodo S.", ["D12", "D12", "D12", "OFF", "OFF", "D12", "D12"]],
    ["503264140", "Rina Marlina", ["CR", "CR", "CR", "CR", "CR", "OFF", "OFF"]],
    ["503264141", "Agus Salim", ["D10", "OFF", "D10", "D10", "D10", "D10", "OFF"]],
    ["503264142", "Maya Sari", ["N12", "N12", "N12", "N12", "OFF", "OFF", "N12"]],
  ]
  // sisipan realistis: sakit & alpha di tengah bulan
  const OVERRIDE: Record<string, Record<number, string>> = {
    "503264135": { 14: "S" },
    "503264141": { 9: "A" },
  }
  function colorOf(c: string) {
    if (c === "OFF" || c === "CR" || c === "AL") return "var(--text-tertiary)"
    if (c === "S" || c === "SD" || c === "A" || c === "I") return "var(--color-danger-text)"
    if (c.charAt(0) === "N") return "var(--color-primary-bright)"
    return "var(--text-secondary)"
  }
  const days: string[] = []
  for (let d = 1; d <= 31; d++) days.push(`${d < 10 ? "0" : ""}${d} Jul`)
  const rows = EMP.map((e) => {
    const codes = []
    for (let d = 1; d <= 31; d++) {
      let c = e[2][(d - 1) % 7]
      if (OVERRIDE[e[0]]?.[d]) c = OVERRIDE[e[0]][d]
      codes.push({ v: c, color: colorOf(c) })
    }
    return { nik: e[0], name: e[1], codes }
  })
  return { days, rows }
}

/* ===== Kode pilihan form revisi ===== */
export function revCodeList(lang: Lang): string[] {
  const en = lang === "en"
  return [
    `D — ${en ? "Day shift" : "Shift siang"}`,
    `D12 — ${en ? "Day 12 hours" : "Siang 12 jam"}`,
    `N — ${en ? "Night shift" : "Shift malam"}`,
    `N12 — ${en ? "Night 12 hours" : "Malam 12 jam"}`,
    `OFF — ${en ? "Roster day off" : "Hari libur roster"}`,
    `CR — ${en ? "Roster leave" : "Cuti roster"}`,
    "AL — Annual leave",
    `S — ${en ? "Sick" : "Sakit"}`,
    `SD — ${en ? "Sick + doctor's note" : "Sakit + surat dokter"}`,
    `I — ${en ? "Permitted absence" : "Izin"}`,
  ]
}

/* ===== 3 · approval ===== */
export type ApRow = {
  sid: string
  name: string
  nik: string
  whatId: string
  whatEn: string
  whenId: string
  whenEn: string
  status: "pending" | "approved" | "rejected"
  byId?: string
  byEn?: string
}

export function apInitialRows(): ApRow[] {
  return [
    { sid: "REV-0711-02", name: "First Angel Paustine", nik: "503264133", whatId: "10 Jul — check-in 06:02 → 05:45 · antre fingerprint", whatEn: "10 Jul — check-in 06:02 → 05:45 · fingerprint queue", whenId: "hari ini 07:12", whenEn: "today 07:12", status: "pending" },
    { sid: "REV-0711-02", name: "Agus Salim", nik: "503264141", whatId: "09 Jul — check-out kosong → 17:30 · alat rusak di pit", whatEn: "09 Jul — missing check-out → 17:30 · broken device at the pit", whenId: "hari ini 07:12", whenEn: "today 07:12", status: "pending" },
    { sid: "REV-0711-02", name: "Siti Nurhaliza", nik: "503264136", whatId: "08 Jul — kode A → SD · surat dokter menyusul", whatEn: "08 Jul — code A → SD · doctor's note to follow", whenId: "hari ini 07:12", whenEn: "today 07:12", status: "pending" },
    { sid: "REV-0709-05", name: "Maya Sari", nik: "503264142", whatId: "07 Jul — kode D12 → OFF · tukar shift disetujui spv", whatEn: "07 Jul — code D12 → OFF · shift swap approved by spv", whenId: "2 hari lalu", whenEn: "2 days ago", status: "pending" },
    { sid: "REV-0708-03", name: "Rahmat Hidayat", nik: "503264134", whatId: "06 Jul — check-in 06:15 → 06:00 · mesin offline", whatEn: "06 Jul — check-in 06:15 → 06:00 · machine offline", whenId: "3 hari lalu", whenEn: "3 days ago", status: "approved", byId: "First Angel · 09 Jul 08:20", byEn: "First Angel · 09 Jul 08:20" },
    { sid: "REV-0707-01", name: "Budi Santoso", nik: "503264135", whatId: "05 Jul — kode A → I · tanpa bukti pendukung", whatEn: "05 Jul — code A → I · no supporting evidence", whenId: "4 hari lalu", whenEn: "4 days ago", status: "rejected", byId: "First Angel · 08 Jul 10:02 — bukti tidak sesuai", byEn: "First Angel · 08 Jul 10:02 — evidence mismatch" },
  ]
}

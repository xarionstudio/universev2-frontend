import type { Lang } from "@/lib/i18n"

/* ===== 4 · attendance ===== */
export type AttStatus = "hadir" | "terlambat" | "belum" | "unfit" | "off"

export type AttRow = {
  name: string
  nik: string
  dept: string
  code: string
  in: string
  inM: string
  out: string
  outM: string
  st: AttStatus
  date?: string
  dLabel?: string
}

export function attDayRows(lang: Lang, complete: boolean): AttRow[] {
  const en = lang === "en"
  const M1 = en ? "FP-01 · Office" : "FP-01 · Kantor"
  const M2 = en ? "FP-02 · North gate" : "FP-02 · Gate utara"
  const M3 = en ? "FP-03 · South gate" : "FP-03 · Gate selatan"
  const M4 = "FP-04 · Workshop"
  if (complete) {
    // roster arsip — hari penuh, sesi lengkap
    return [
      { name: "First Angel Paustine", nik: "503264133", dept: "Operation", code: "D12", in: "05:41", inM: M2, out: "17:35", outM: M2, st: "hadir" },
      { name: "Rahmat Hidayat", nik: "503264134", dept: "SDI", code: "D8", in: "06:55", inM: M1, out: "16:02", outM: M1, st: "hadir" },
      { name: "Budi Santoso", nik: "503264135", dept: "HRGA", code: "D8", in: "06:48", inM: M1, out: "16:10", outM: M1, st: "hadir" },
      { name: "Siti Nurhaliza", nik: "503264136", dept: "Operation", code: "D12", in: "05:52", inM: M3, out: "17:40", outM: M3, st: "hadir" },
      { name: "Andi Prasetyo", nik: "503264137", dept: "Plant", code: "D10", in: "06:35", inM: M4, out: "17:05", outM: M4, st: "terlambat" },
      { name: "Dewi Lestari", nik: "503264138", dept: "SDI", code: "D8", in: "06:52", inM: M1, out: "16:04", outM: M1, st: "hadir" },
      { name: "Joko Widodo S.", nik: "503264139", dept: "Operation", code: "D12", in: "05:58", inM: M3, out: "17:38", outM: M3, st: "hadir" },
      { name: "Rina Marlina", nik: "503264140", dept: "HRGA", code: "OFF", in: "", inM: "", out: "", outM: "", st: "off" },
      { name: "Agus Salim", nik: "503264141", dept: "Plant", code: "D10", in: "06:20", inM: M4, out: "17:01", outM: M4, st: "hadir" },
      { name: "Maya Sari", nik: "503264142", dept: "Operation", code: "N12", in: "17:45", inM: M2, out: "05:32", outM: M2, st: "hadir" },
    ]
  }
  return [
    { name: "First Angel Paustine", nik: "503264133", dept: "Operation", code: "D12", in: "05:45", inM: M2, out: "17:32", outM: M2, st: "hadir" },
    { name: "Rahmat Hidayat", nik: "503264134", dept: "SDI", code: "D8", in: "07:02", inM: M1, out: "", outM: "", st: "hadir" },
    { name: "Budi Santoso", nik: "503264135", dept: "HRGA", code: "D8", in: "", inM: "", out: "", outM: "", st: "unfit" },
    { name: "Siti Nurhaliza", nik: "503264136", dept: "Operation", code: "D12", in: "05:51", inM: M3, out: "", outM: "", st: "hadir" },
    { name: "Andi Prasetyo", nik: "503264137", dept: "Plant", code: "D10", in: "06:31", inM: M4, out: "", outM: "", st: "terlambat" },
    { name: "Dewi Lestari", nik: "503264138", dept: "SDI", code: "D8", in: "06:58", inM: M1, out: "", outM: "", st: "hadir" },
    { name: "Joko Widodo S.", nik: "503264139", dept: "Operation", code: "D12", in: "", inM: "", out: "", outM: "", st: "belum" },
    { name: "Rina Marlina", nik: "503264140", dept: "HRGA", code: "CR", in: "", inM: "", out: "", outM: "", st: "off" },
    { name: "Agus Salim", nik: "503264141", dept: "Plant", code: "D10", in: "", inM: "", out: "", outM: "", st: "unfit" },
    { name: "Maya Sari", nik: "503264142", dept: "Operation", code: "N12", in: "", inM: "", out: "", outM: "", st: "off" },
  ]
}

/* log attendance gabungan — tiap baris berstempel tanggal (untuk date range) */
export function attData(lang: Lang): AttRow[] {
  const MON =
    lang === "en"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  function stamp(rows: AttRow[], iso: string): AttRow[] {
    const d = new Date(`${iso}T00:00:00`)
    const lbl = `${d.getDate() < 10 ? "0" : ""}${d.getDate()} ${MON[d.getMonth()]}`
    return rows.map((r) => ({ ...r, date: iso, dLabel: lbl }))
  }
  const today = new Date().toISOString().slice(0, 10)
  return stamp(attDayRows(lang, false), today)
    .concat(stamp(attDayRows(lang, true), "2026-07-10"))
    .concat(stamp(attDayRows(lang, true), "2026-06-30"))
    .concat(stamp(attDayRows(lang, true), "2026-05-31"))
}

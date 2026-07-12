/* Data layar kiosk — dipindah dari HTML statis desain; kiosk tampil id-only. */

export type KioskTone = "success" | "warning" | "danger" | "neutral" | "info"

/* Attendance — [nama, nik, dept, checkIn, mesin, tone, label] */
export type KioskAttRow = {
  name: string
  nik: string
  dept: string
  checkIn: string
  machine: string
  tone: KioskTone
  label: string
}

export const kioskAttRows: KioskAttRow[] = [
  { name: "First Angel Paustine", nik: "503264133", dept: "Operation", checkIn: "05:45", machine: "Gate utara", tone: "success", label: "Fit" },
  { name: "Siti Nurhaliza", nik: "503264136", dept: "Operation", checkIn: "05:51", machine: "Gate selatan", tone: "success", label: "Fit" },
  { name: "Dewi Lestari", nik: "503264138", dept: "SDI", checkIn: "06:58", machine: "Kantor", tone: "success", label: "Fit" },
  { name: "Rahmat Hidayat", nik: "503264134", dept: "SDI", checkIn: "07:02", machine: "Kantor", tone: "success", label: "Fit" },
  { name: "Andi Prasetyo", nik: "503264137", dept: "Plant", checkIn: "06:31", machine: "Workshop", tone: "warning", label: "Terlambat" },
  { name: "Budi Santoso", nik: "503264135", dept: "HRGA", checkIn: "—", machine: "—", tone: "danger", label: "Kurang tidur" },
  { name: "Agus Salim", nik: "503264141", dept: "Plant", checkIn: "—", machine: "—", tone: "danger", label: "Kurang tidur" },
  { name: "Joko Widodo S.", nik: "503264139", dept: "Operation", checkIn: "—", machine: "—", tone: "warning", label: "Belum absen" },
  { name: "Maya Sari", nik: "503264142", dept: "Operation", checkIn: "05:49", machine: "Gate utara", tone: "success", label: "Fit" },
  { name: "Hendra Gunawan", nik: "503264143", dept: "Plant", checkIn: "06:12", machine: "Workshop", tone: "success", label: "Fit" },
]

/* Fleet — breakdown selalu di urutan teratas */
export type KioskFleetRow = {
  code: string
  type: string
  operator: string
  loc: string
  tone: KioskTone
  label: string
}

export const kioskFleetRows: KioskFleetRow[] = [
  { code: "RD5004", type: "777E · CATERPILLAR", operator: "—", loc: "Panel East - Atas Selatan", tone: "danger", label: "Breakdown" },
  { code: "RD5047", type: "777E · CATERPILLAR", operator: "—", loc: "Panel East - Atas Selatan", tone: "danger", label: "Breakdown" },
  { code: "RD5080", type: "HD785-7 · KOMATSU", operator: "—", loc: "Kasturi Tengah", tone: "danger", label: "Breakdown" },
  { code: "EX7001", type: "EX2000-7BH · HITACHI", operator: "David Pakiding", loc: "Panel East - Puncak Utara", tone: "success", label: "Ready" },
  { code: "RD5001", type: "777E · CATERPILLAR", operator: "First Angel P.", loc: "Panel East - Atas Selatan", tone: "success", label: "Ready" },
  { code: "RD5002", type: "777E · CATERPILLAR", operator: "Siti Nurhaliza", loc: "Panel East - Atas Selatan", tone: "success", label: "Ready" },
  { code: "EX7007", type: "PC2000-11 · KOMATSU", operator: "Hendrik", loc: "Kasturi Tengah Bawah", tone: "success", label: "Ready" },
  { code: "RD5061", type: "HD785-7 · KOMATSU", operator: "Rizky Ananda", loc: "Kasturi Tengah Bawah", tone: "success", label: "Ready" },
  { code: "WT1009", type: "K460 6x6 · RENAULT", operator: "Maya Sari", loc: "Jalan hauling", tone: "success", label: "Ready" },
  { code: "GD5001", type: "16GC · CATERPILLAR", operator: "—", loc: "Jalan hauling", tone: "neutral", label: "Standby" },
]

/* Fit to work — kurang tidur & belum lapor selalu teratas */
export type KioskFtwRow = {
  name: string
  nik: string
  dept: string
  shift: string
  sleep: string
  tone: KioskTone
  label: string
}

export const kioskFtwRows: KioskFtwRow[] = [
  { name: "Budi Santoso", nik: "503264135", dept: "HRGA", shift: "D1", sleep: "3 j 40 m", tone: "danger", label: "Kurang tidur" },
  { name: "Agus Salim", nik: "503264141", dept: "Plant", shift: "D1", sleep: "3 j 55 m", tone: "danger", label: "Kurang tidur" },
  { name: "Joko Widodo S.", nik: "503264139", dept: "Operation", shift: "D1", sleep: "—", tone: "warning", label: "Belum lapor" },
  { name: "Rina Marlina", nik: "503264140", dept: "HRGA", shift: "OFF", sleep: "—", tone: "warning", label: "Belum lapor" },
  { name: "First Angel Paustine", nik: "503264133", dept: "Operation", shift: "D1", sleep: "7 j 10 m", tone: "success", label: "Fit" },
  { name: "Siti Nurhaliza", nik: "503264136", dept: "Operation", shift: "D1", sleep: "6 j 45 m", tone: "success", label: "Fit" },
  { name: "Maya Sari", nik: "503264142", dept: "Operation", shift: "N1", sleep: "8 j 05 m", tone: "success", label: "Fit" },
  { name: "Rizky Ananda", nik: "503264150", dept: "Operation", shift: "D1", sleep: "7 j 30 m", tone: "success", label: "Fit" },
  { name: "Hendra Gunawan", nik: "503264143", dept: "Plant", shift: "D1", sleep: "6 j 55 m", tone: "success", label: "Fit" },
  { name: "Dewi Lestari", nik: "503264138", dept: "SDI", shift: "D1", sleep: "7 j 20 m", tone: "success", label: "Fit" },
]

/* Fingerprint — mesin offline selalu diurutkan teratas */
export type KioskMachine = {
  id: string
  loc: string
  online: boolean
  meta: string
}

export const kioskMachines: KioskMachine[] = [
  { id: "FP-07", loc: "Gate selatan", online: false, meta: "terakhir aktif 04:52" },
  { id: "FP-11", loc: "Mess Karang Joang", online: false, meta: "terakhir aktif kemarin 21:14" },
  { id: "FP-01", loc: "Kantor SDI", online: true, meta: "312 scan" },
  { id: "FP-02", loc: "Gate utara", online: true, meta: "284 scan" },
  { id: "FP-03", loc: "Gate selatan", online: true, meta: "201 scan" },
  { id: "FP-04", loc: "Workshop Plant", online: true, meta: "145 scan" },
  { id: "FP-05", loc: "Kantor HRGA", online: true, meta: "98 scan" },
  { id: "FP-06", loc: "Pit utara", online: true, meta: "64 scan" },
  { id: "FP-08", loc: "Pit selatan", online: true, meta: "52 scan" },
  { id: "FP-09", loc: "Warehouse", online: true, meta: "31 scan" },
  { id: "FP-10", loc: "Kantin", online: true, meta: "14 scan" },
  { id: "FP-12", loc: "Klinik", online: true, meta: "7 scan" },
]

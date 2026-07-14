/* Notifikasi in-app (mock) — teks dwibahasa mengikuti pola whatId/whatEn
   pada data roster; urutan array = terbaru dulu */

export type NotifTone = "info" | "success" | "warning" | "danger";

/* kelas dot warna per tone — dipakai dropdown topbar & halaman notifikasi */
export const notifToneDot: Record<NotifTone, string> = {
  info: "bg-(--color-primary)",
  success: "bg-(--badge-success-text)",
  warning: "bg-(--badge-warning-text)",
  danger: "bg-(--color-danger)",
};

export type Notif = {
  id: string;
  tone: NotifTone;
  textId: string;
  textEn: string;
  timeId: string;
  timeEn: string;
  read: boolean;
};

export const initialNotifs: Notif[] = [
  {
    id: "n1",
    tone: "warning",
    textId: "14 revisi absensi menunggu approval",
    textEn: "14 attendance revisions awaiting approval",
    timeId: "5 menit lalu",
    timeEn: "5 minutes ago",
    read: false,
  },
  {
    id: "n2",
    tone: "danger",
    textId: "Unit DT-114 berstatus Breakdown",
    textEn: "Unit DT-114 is in Breakdown status",
    timeId: "32 menit lalu",
    timeEn: "32 minutes ago",
    read: false,
  },
  {
    id: "n3",
    tone: "success",
    textId: "Upload roster Juli berhasil diproses",
    textEn: "July roster upload processed successfully",
    timeId: "1 jam lalu",
    timeEn: "1 hour ago",
    read: false,
  },
  {
    id: "n4",
    tone: "warning",
    textId: "3 operator Unfit pada shift pagi hari ini",
    textEn: "3 operators unfit on today's day shift",
    timeId: "2 jam lalu",
    timeEn: "2 hours ago",
    read: true,
  },
  {
    id: "n5",
    tone: "danger",
    textId: "Display TV Mess 31 terputus dari jaringan",
    textEn: "TV Mess 31 display disconnected from network",
    timeId: "3 jam lalu",
    timeEn: "3 hours ago",
    read: true,
  },
  {
    id: "n6",
    tone: "info",
    textId: "Alokasi fleet EX7002 shift malam belum lengkap",
    textEn: "Fleet EX7002 night-shift allocation incomplete",
    timeId: "5 jam lalu",
    timeEn: "5 hours ago",
    read: true,
  },
  {
    id: "n7",
    tone: "warning",
    textId: "SIMPER 5 operator kedaluwarsa bulan ini",
    textEn: "5 operators' SIMPER expire this month",
    timeId: "Kemarin 15:20",
    timeEn: "Yesterday 15:20",
    read: true,
  },
  {
    id: "n8",
    tone: "info",
    textId: "User baru clinic@unggul.co.id diundang",
    textEn: "New user clinic@unggul.co.id invited",
    timeId: "Kemarin 09:12",
    timeEn: "Yesterday 09:12",
    read: true,
  },
  {
    id: "n9",
    tone: "success",
    textId: "Jadwal audio P2H shift pagi diperbarui",
    textEn: "Morning-shift P2H audio schedule updated",
    timeId: "2 hari lalu",
    timeEn: "2 days ago",
    read: true,
  },
  {
    id: "n10",
    tone: "info",
    textId: "MCU 12 karyawan dijadwalkan minggu depan",
    textEn: "MCU for 12 employees scheduled next week",
    timeId: "2 hari lalu",
    timeEn: "2 days ago",
    read: true,
  },
];

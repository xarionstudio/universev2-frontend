/* Notifikasi in-app — diambil dari backend API GET /api/notifications */

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
  createdAt?: string;
};

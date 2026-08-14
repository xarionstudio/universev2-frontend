import type { Lang } from "@/lib/i18n";

/** Offset WITA (UTC+8) dalam menit */
const WITA_OFFSET_MIN = 8 * 60;

/**
 * Tanggal ISO (YYYY-MM-DD) hari ini dalam zona WITA (UTC+8).
 *
 * Menggunakan offset tetap alih-alih `toISOString()` yang selalu UTC —
 * menghindari bug tanggal kemarin pada pukul 00:00–07:59 WITA.
 */
export function todayIso(): string {
  return dateToIsoWita(new Date());
}

/**
 * Konversi Date ke string ISO (YYYY-MM-DD) dalam zona WITA (UTC+8).
 */
export function dateToIsoWita(d: Date): string {
  const wita = new Date(d.getTime() + WITA_OFFSET_MIN * 60000);
  return wita.toISOString().slice(0, 10);
}

/**
 * Hitung string relatif ("5 menit lalu" / "Just now") dari sebuah
 * timestamp ISO — **realtime**, dihitung ulang setiap render.
 *
 * Dipakai di topbar notifikasi & halaman notifikasi penuh agar konsisten
 * dan selalu akurat, menggantikan string statis `timeId`/`timeEn` yang
 * dihitung sekali di backend dan tidak pernah berubah.
 */
export function getRelativeTime(dateStr: string, lang: Lang = "id"): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (lang === "id") {
      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    } else {
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
    }
  } catch {
    return lang === "id" ? "Baru saja" : "Just now";
  }
}

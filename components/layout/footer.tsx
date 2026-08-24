"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

/* Footer global: copyright + versi aplikasi. Dipakai di shell (app), login,
   dan register; kiosk TV hanya menampilkan versinya (lihat display-shell). */
export function Footer({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <footer
      className={cn(
        "flex flex-none items-center justify-center gap-2 text-center text-xs text-(--text-tertiary)",
        className
      )}
    >
      <span>{t.loginCopy}</span>
      <span aria-hidden>·</span>
      <span className="font-mono">{APP_VERSION}</span>
    </footer>
  );
}

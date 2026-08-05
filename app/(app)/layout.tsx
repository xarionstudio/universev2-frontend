"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { moduleOfPath } from "@/lib/rbac";
import { RbacDenied } from "@/components/layout/rbac-denied";
import { ShellProvider } from "@/components/layout/shell-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { WeatherLayer } from "@/components/layout/weather-layer";
import { WeatherTheme } from "@/components/layout/weather-theme";
import { usePermissions } from "@/components/providers/permissions";
import { RefreshProvider } from "@/components/providers/refresh";
import { useSession } from "@/components/providers/session";
import { WeatherProvider } from "@/components/providers/weather";

/* Shell admin: blob glow + sidebar + topbar + konten.
   Dua lapis penjagaan:
     1. Autentikasi — belum login dilempar ke /login (perilaku lama).
     2. Otorisasi — sudah login tapi role-nya tidak punya permission untuk
        route ini akan melihat halaman "tidak punya akses", bukan kontennya. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { email, hydrated } = useSession();
  const { user, can, ready } = usePermissions();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!email) router.replace("/login");
  }, [hydrated, email, router]);

  // jangan render apa pun sebelum sesi terbaca — hindari kedip konten
  if (!hydrated || !ready) return null;
  if (!email) return null;

  const mod = moduleOfPath(pathname);
  // email tersimpan tapi tidak cocok dengan user mana pun (mis. data di-reset)
  const denied = !user
    ? t.rbacNoAccount
    : mod && !can(mod, "view")
      ? undefined
      : null;

  return (
    <ShellProvider>
      <RefreshProvider>
        {/* Cuaca dipasang DI SINI, bukan di root providers: hanya rute di dalam
            grup (app) yang mendapat lapisan cuaca, jadi layar kiosk/TV dan
            halaman login tidak tersentuh sama sekali. Posisinya juga SETELAH
            guard `if (!hydrated || !ready) return null` di atas, sehingga
            usePermissions().user sudah terisi saat provider mount dan site
            tidak pernah loncat Balikpapan → Mess 31. */}
        <WeatherProvider>
          <WeatherLayer />
          {/* cuaca -> tema aplikasi (hanya bila tema di-set "Ikut cuaca") */}
          <WeatherTheme />
          <div className="pointer-events-none fixed -top-30 -right-25 z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
          <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />
          {/* Padding shell turun bertahap: 24px desktop → 16px tablet → 12px
              ponsel. Pada 360px, 24px di dua sisi memakan 13% lebar layar dan
              itu diambil langsung dari kolom tabel. */}
          <div className="p-6 max-xl:p-4 max-sm:p-3">
            <div className="relative z-1 mx-auto flex min-h-[calc(100vh-48px)] max-w-460 items-stretch gap-6 max-xl:block max-xl:min-h-[calc(100vh-32px)] max-sm:min-h-[calc(100vh-24px)]">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col gap-6 max-sm:gap-4">
                <Topbar />
                {/* Tanpa max-w sendiri: dulu konten dipatok 1440px sementara
                    topbar di atasnya ikut melebar sampai batas shell (1840px),
                    jadi di layar ≥1856px tepi kanan keduanya tidak segaris. */}
                <div className="flex min-w-0 flex-1 flex-col gap-6 max-sm:gap-4">
                  {denied === null ? children : <RbacDenied reason={denied} />}
                </div>
              </div>
            </div>
          </div>
        </WeatherProvider>
      </RefreshProvider>
    </ShellProvider>
  );
}

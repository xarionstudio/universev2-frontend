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
          <div className="pointer-events-none fixed -top-30 -right-25 z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
          <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />
          <div className="p-6 max-xl:p-4">
            <div className="relative z-1 mx-auto flex min-h-[calc(100vh-48px)] max-w-460 items-stretch gap-6 max-xl:block max-xl:min-h-[calc(100vh-32px)]">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col gap-6">
                <Topbar />
                <div className="flex max-w-360 flex-1 flex-col gap-6">
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

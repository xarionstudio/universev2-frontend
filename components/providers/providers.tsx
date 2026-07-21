"use client";

import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";

import { AppStoreProvider } from "./app-store";
import { SessionProvider } from "./session";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {/* Sesi di luar app-store: identitas tidak bergantung pada data, tapi
            usePermissions() menurunkan keduanya menjadi permission efektif. */}
        <SessionProvider>
          <AppStoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </AppStoreProvider>
        </SessionProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

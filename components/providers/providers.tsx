"use client";

import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";

import { AppStoreProvider } from "./app-store";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppStoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppStoreProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

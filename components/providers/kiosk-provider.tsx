"use client"

import * as React from "react"
import { X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

/* Overlay layar kiosk fullscreen (iframe, Esc menutup) — dipanggil dari
   sidebar (anak grup Display) dan halaman admin Kiosk Display. */
type KioskContextValue = { openKiosk: (url: string) => void }

const KioskContext = React.createContext<KioskContextValue>({
  openKiosk: () => {},
})

export function KioskProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUrl(null)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [url])

  const value = React.useMemo(() => ({ openKiosk: setUrl }), [])

  return (
    <KioskContext.Provider value={value}>
      {children}
      {url ? (
        <div className="fixed inset-0 z-400 flex flex-col bg-[#010416]">
          <iframe
            src={url}
            title="Kiosk"
            className="w-full flex-1 border-none bg-[#010416]"
          />
          <Button
            variant="secondary"
            onClick={() => setUrl(null)}
            className="fixed top-4 right-4 z-401"
          >
            <X />
            {t.dspCloseKiosk}
          </Button>
        </div>
      ) : null}
    </KioskContext.Provider>
  )
}

export function useKiosk() {
  return React.useContext(KioskContext)
}

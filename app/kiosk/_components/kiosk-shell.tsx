"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

/* Shell layar kiosk TV 16:9 (dilihat ±6 m) — kanvas tetap 1920×1080 di-letterbox
   via transform:scale(); jam real-time; pixel-shift anti burn-in; banner koneksi
   + demo switch Online/Terputus. Kiosk dark-only dan id-only (tanpa resolver tema). */

function two(n: number) {
  return (n < 10 ? "0" : "") + n
}
function fmt(d: Date) {
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
}

export type KioskStat = {
  icon: React.ReactNode
  iconClass: string
  value: string
  label: string
}

export function KioskShell({
  title,
  stats,
  children,
}: {
  title: string
  stats: KioskStat[]
  children: React.ReactNode
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [clock, setClock] = React.useState("--:--:--")
  const [fresh, setFresh] = React.useState("—")
  const [stale, setStale] = React.useState("—")
  const [dateLine, setDateLine] = React.useState("")
  const [online, setOnline] = React.useState(true)
  const onlineRef = React.useRef(true)

  /* letterbox scale-to-fit: kanvas tetap 1920×1080 */
  React.useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    function rescale() {
      const s = Math.min(innerWidth / 1920, innerHeight / 1080)
      cv!.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`
    }
    rescale()
    window.addEventListener("resize", rescale)
    return () => window.removeEventListener("resize", rescale)
  }, [])

  /* jam nyata + kesegaran data (refresh tiap 30 dtk saat online) */
  React.useEffect(() => {
    const now = new Date()
    const t0 = setTimeout(() => {
      setClock(fmt(now))
      setFresh(`${fmt(now)} WITA`)
      setDateLine(
        `${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Site Karang Joang`
      )
    }, 0)
    const tick = setInterval(() => setClock(fmt(new Date())), 1000)
    const freshTick = setInterval(() => {
      if (onlineRef.current) setFresh(`${fmt(new Date())} WITA`)
    }, 30000)
    return () => {
      clearTimeout(t0)
      clearInterval(tick)
      clearInterval(freshTick)
    }
  }, [])

  function setConn(on: boolean) {
    onlineRef.current = on
    setOnline(on)
    if (!on) setStale(`${fmt(new Date())} WITA`)
    else setFresh(`${fmt(new Date())} WITA`)
  }

  return (
    <div data-theme="dark" className="fixed inset-0 overflow-hidden bg-black font-sans tracking-(--tracking-brand) text-(--text-primary)">
      <div
        ref={canvasRef}
        className="absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden bg-(image:--gradient-kiosk)"
      >
        <div className="pointer-events-none absolute -top-50 -right-35 z-0 size-160 rounded-full bg-(--blob-cyan) blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-55 -left-30 z-0 size-140 rounded-full bg-(--blob-blue) blur-[140px]" />

        <div className="kiosk-stage relative z-1 flex h-[1080px] flex-col gap-8 px-14 py-12 [animation:pxshift_480s_steps(1)_infinite]">
          {/* header */}
          <header className="flex flex-none items-center gap-7">
            <div className="grid size-16 flex-none place-items-center rounded-full bg-linear-[1.86deg] from-[#0054C7] to-[#00CFFE] text-[26px] font-bold text-white shadow-[0_0_0_3px_rgba(255,255,255,.28),0_0_28px_rgba(0,212,255,.4)]">
              U
            </div>
            <div>
              <h1 className="text-[40px] leading-tight font-bold">{title}</h1>
              <p className="mt-1 text-2xl text-(--text-secondary)">{dateLine}</p>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="flex items-center gap-3 text-[22px] text-(--text-secondary)">
                <span
                  className={cn(
                    "size-3.5 rounded-full",
                    online
                      ? "bg-(--color-success) shadow-[0_0_12px_rgba(23,206,100,.9)]"
                      : "kiosk-offline-dot bg-(--color-danger) shadow-[0_0_12px_rgba(252,60,59,.9)] [animation:kblink_1.2s_infinite]"
                  )}
                />
                Diperbarui{" "}
                <b className="font-mono font-semibold text-(--text-primary) tabular-nums">
                  {fresh}
                </b>
              </div>
              <div className="glass-card flex flex-col items-center gap-0.5 rounded-full px-8.5 py-3.5">
                <span className="font-mono text-[44px] leading-none font-bold tabular-nums">
                  {clock}
                </span>
                <span className="text-lg text-(--text-secondary)">WITA</span>
              </div>
            </div>
          </header>

          {/* banner koneksi terputus */}
          {!online ? (
            <div
              role="alert"
              className="flex flex-none items-center gap-4 rounded-card border border-(--badge-danger-border) bg-(--badge-danger-fill) px-7 py-4.5"
            >
              <WifiOff className="size-8 flex-none text-(--color-danger-text)" strokeWidth={2} />
              <div>
                <b className="text-[26px] font-bold text-(--color-danger-text)">
                  Koneksi terputus — data tidak diperbarui
                </b>
                <br />
                <span className="text-xl text-(--color-danger-text) opacity-85">
                  Menampilkan data terakhir {stale}. Menghubungkan ulang…
                </span>
              </div>
            </div>
          ) : null}

          {/* stat kiosk (G2) */}
          <div className="grid flex-none grid-cols-3 gap-7">
            {stats.map((s) => (
              <div
                key={s.label}
                className="glass-card flex items-center gap-7 rounded-panel px-9 py-7"
              >
                <div
                  className={cn(
                    "grid size-18 flex-none place-items-center rounded-card border [&_svg]:size-8.5",
                    s.iconClass
                  )}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="text-[80px] leading-none font-bold tabular-nums">{s.value}</div>
                  <div className="mt-1.5 text-2xl font-semibold text-(--text-secondary)">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {children}
        </div>
      </div>

      {/* demo switch (bukan bagian desain kiosk) */}
      <div
        role="group"
        aria-label="Demo koneksi"
        className="fixed right-4 bottom-4 z-90 flex gap-1.5 rounded-xl border border-(--glass-2-border) bg-(--overlay-fill) p-1.5 shadow-(--shadow-modal)"
      >
        <span className="self-center px-1.5 pl-2 text-[11px] text-(--text-tertiary)">Demo:</span>
        {(
          [
            [true, "Online"],
            [false, "Terputus"],
          ] as [boolean, string][]
        ).map(([on, label]) => (
          <button
            key={label}
            onClick={() => setConn(on)}
            className={cn(
              "cursor-pointer rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold",
              online === on
                ? "border-[rgba(0,212,255,.4)] bg-[rgba(0,212,255,.12)] text-(--color-primary-bright)"
                : "text-(--text-secondary) hover:bg-[rgba(255,255,255,.08)] hover:text-(--text-primary)"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

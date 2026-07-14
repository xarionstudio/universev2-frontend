"use client";

import * as React from "react";
import { Megaphone, Monitor, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

/* Shell layar kiosk TV 16:9 (dilihat ±6 m) — kanvas tetap 1920×1080 di-letterbox
   via transform:scale(); jam real-time; pixel-shift anti burn-in; banner koneksi
   + demo switch Online/Terputus. Kiosk dark-only dan id-only (tanpa resolver tema). */

function two(n: number) {
  return (n < 10 ? "0" : "") + n;
}
function fmt(d: Date) {
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

export type DisplayStat = {
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  label: string;
};

export function DisplayShell({
  title,
  meta,
  deviceName,
  stats,
  runtext,
  children,
}: {
  title: string;
  /* info tambahan di baris bawah judul (mis. lokasi + chip bus fleet) */
  meta?: React.ReactNode;
  /* nama display terdaftar (mis. "TV Gate Utara") — dikirim lewat ?name= */
  deviceName?: string;
  stats: DisplayStat[];
  runtext?: string;
  children: React.ReactNode;
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [clock, setClock] = React.useState("--:--:--");
  const [stale, setStale] = React.useState("—");
  const [dateLine, setDateLine] = React.useState("");
  const [online, setOnline] = React.useState(true);

  /* letterbox scale-to-fit: kanvas tetap 1920×1080 */
  React.useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    function rescale() {
      const s = Math.min(innerWidth / 1920, innerHeight / 1080);
      cv!.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
    }
    rescale();
    window.addEventListener("resize", rescale);
    return () => window.removeEventListener("resize", rescale);
  }, []);

  /* selalu fullscreen: coba saat dibuka; bila browser menolak (butuh gestur),
     interaksi pertama di layar memicunya */
  React.useEffect(() => {
    const goFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    goFullscreen();
    const onFirstInput = () => {
      goFullscreen();
      if (document.fullscreenElement) {
        document.removeEventListener("pointerdown", onFirstInput);
        document.removeEventListener("keydown", onFirstInput);
      }
    };
    document.addEventListener("pointerdown", onFirstInput);
    document.addEventListener("keydown", onFirstInput);
    return () => {
      document.removeEventListener("pointerdown", onFirstInput);
      document.removeEventListener("keydown", onFirstInput);
    };
  }, []);

  /* jam nyata + baris tanggal */
  React.useEffect(() => {
    const now = new Date();
    const t0 = setTimeout(() => {
      setClock(fmt(now));
      setDateLine(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    }, 0);
    const tick = setInterval(() => setClock(fmt(new Date())), 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(tick);
    };
  }, []);

  function setConn(on: boolean) {
    setOnline(on);
    if (!on) setStale(`${fmt(new Date())} WITA`);
  }

  return (
    <div
      data-theme="dark"
      className="fixed inset-0 overflow-hidden bg-black font-sans tracking-(--tracking-brand) text-(--text-primary)"
    >
      <div
        ref={canvasRef}
        className="absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden bg-(image:--gradient-kiosk)"
      >
        <div className="pointer-events-none absolute -top-50 -right-35 z-0 size-160 rounded-full bg-(--blob-cyan) blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-55 -left-30 z-0 size-140 rounded-full bg-(--blob-blue) blur-[140px]" />

        <div className="display-stage relative z-1 flex h-[1080px] [animation:pxshift_480s_steps(1)_infinite] flex-col gap-7 px-14 pt-10 pb-22">
          {/* header */}
          <header className="flex flex-none items-center gap-7">
            <div className="grid size-16 flex-none place-items-center rounded-full bg-(image:--gradient-logo) text-[26px] font-bold text-white shadow-[0_0_0_3px_rgba(255,255,255,.28),0_0_28px_rgba(0,212,255,.4)]">
              U
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[40px] leading-tight font-bold">
                {title}
              </h1>
              {meta ? (
                <div className="mt-1.5 flex min-w-0 items-center gap-3 text-2xl text-(--text-secondary)">
                  {meta}
                </div>
              ) : null}
            </div>
            {deviceName ? (
              <div className="flex flex-none items-center gap-3 rounded-full px-6 py-3 glass-card">
                <Monitor className="size-6 text-(--color-primary-bright)" />
                <span className="text-[22px] font-semibold">{deviceName}</span>
              </div>
            ) : null}
            <div className="ml-auto flex flex-none items-center gap-6">
              <div className="text-right leading-snug">
                <div className="text-[22px] font-semibold">{dateLine}</div>
                <div className="text-lg text-(--text-secondary)">
                  Site Karang Joang
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-full px-8.5 py-3.5 glass-card">
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
              <WifiOff
                className="size-8 flex-none text-(--color-danger-text)"
                strokeWidth={2}
              />
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
          <div className="grid flex-none grid-cols-4 gap-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-5 rounded-card px-6 py-4 glass-card"
              >
                <div
                  className={cn(
                    "grid size-13 flex-none place-items-center rounded-icon border [&_svg]:size-6.5",
                    s.iconClass
                  )}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="text-[52px] leading-none font-bold tabular-nums">
                    {s.value}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-(--text-secondary)">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {children}
        </div>

        {/* running text — nempel dasar layar, full-bleed tanpa jarak bawah */}
        {runtext ? (
          <div className="absolute inset-x-0 bottom-0 z-1 flex h-16 items-center gap-5 border-t border-(--glass-1-border) bg-(--glass-1-fill) px-14 backdrop-blur-md">
            <span className="grid size-10 flex-none place-items-center rounded-full border border-(--badge-info-border) bg-(--badge-info-fill)">
              <Megaphone className="size-5 text-(--color-primary-bright)" />
            </span>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="display-marquee w-max [animation:kmarquee_28s_linear_infinite] text-2xl whitespace-nowrap text-(--text-secondary)">
                {runtext}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* demo switch (bukan bagian desain kiosk) */}
      <div
        role="group"
        aria-label="Demo koneksi"
        className="fixed right-4 bottom-4 z-90 flex gap-1.5 rounded-xl border border-(--glass-2-border) bg-(--overlay-fill) p-1.5 shadow-(--shadow-modal)"
      >
        <span className="self-center px-1.5 pl-2 text-[11px] text-(--text-tertiary)">
          Demo:
        </span>
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
  );
}

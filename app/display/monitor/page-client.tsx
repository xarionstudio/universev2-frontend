"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { displayRuntext } from "@/lib/data/display-screens";
import type { Fleet } from "@/lib/data/fleet";
import { MONITOR_MAX_FLEETS, MONITOR_PER_PAGE } from "@/lib/data/settings-data";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";
import { shiftNow, useFleetCardsMany } from "../_components/fleet-board";
import { EmptyQuadrant, FleetQuadrant } from "../_components/fleet-quadrant";

/* Layar monitor — satu TV menampilkan 4 formasi fleet SEKALIGUS (2x2), lalu
   keempatnya berganti bersamaan ke 4 fleet berikutnya. Maksimal 12 fleet per
   monitor = 3 halaman.

   Durasi animasi ada DI SINI, bukan hanya di CSS: penjadwal harus tahu kapan
   panel selesai menutup sebelum menukar isinya. Kalau kedua angka ini hidup
   terpisah, isi panel bertukar saat daunnya masih separuh terbuka dan
   pergantiannya terbaca sebagai kedipan, bukan sebagai kartu yang dibalik. */
const FLIP_OUT_MS = 360;
const FLIP_IN_MS = 440;
/* jeda antar kuadran — 4 panel, jadi sapuannya selesai setelah 3 langkah */
const STAGGER_MS = 70;
const CLOSE_TOTAL = FLIP_OUT_MS + STAGGER_MS * (MONITOR_PER_PAGE - 1);
const OPEN_TOTAL = FLIP_IN_MS + STAGGER_MS * (MONITOR_PER_PAGE - 1);
/* sisa waktu terpendek yang masih layak dibaca kalau admin menyetel durasi
   giliran lebih pendek dari animasinya sendiri */
const MIN_HOLD_MS = 800;

type Phase = "open" | "closing" | "opening";

export default function DisplayMonitorPage() {
  const params = useSearchParams();
  const deviceName = params.get("name") ?? undefined;
  const monitorId = params.get("monitor");
  const { dspMonitor, fleets } = useAppStore();

  const monitor =
    dspMonitor.find((m) => m.id === monitorId) ??
    dspMonitor.find((m) => m.active) ??
    dspMonitor[0];

  /* fleet yang benar-benar masih ada di Setting Fleet — formasi yang sudah
     dihapus tidak boleh menyisakan giliran kosong di layar */
  const list = React.useMemo<Fleet[]>(
    () =>
      (monitor?.fleetIds ?? []).slice(0, MONITOR_MAX_FLEETS).flatMap((id) => {
        const f = fleets.find((x) => x.id === id);
        return f ? [f] : [];
      }),
    [monitor, fleets]
  );

  const pageCount = Math.max(1, Math.ceil(list.length / MONITOR_PER_PAGE));
  const [rawPage, setPage] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("open");

  /* Dijepit saat render, BUKAN lewat useEffect: memperbaiki indeks di efek
     berarti satu render sempat memakai halaman di luar rentang — layar
     berkedip kosong sebelum menampilkan isinya yang benar. */
  const page = rawPage % pageCount;

  const rotateMs = Math.max(1, monitor?.rotateSec ?? 10) * 1000;
  const holdMs = Math.max(MIN_HOLD_MS, rotateMs - CLOSE_TOTAL - OPEN_TOTAL);

  /* Satu giliran = tahan → tutup → tukar halaman → buka. Ditulis sebagai
     mesin status tiga fase, bukan satu interval: dengan interval tunggal, tab
     yang di-throttle browser bisa menumpuk timer dan panel tertinggal separuh
     tertutup. Di sini tiap fase menjadwalkan penerusnya sendiri. */
  React.useEffect(() => {
    if (pageCount <= 1) return;
    if (phase === "open") {
      const t = setTimeout(() => setPhase("closing"), holdMs);
      return () => clearTimeout(t);
    }
    if (phase === "closing") {
      const t = setTimeout(() => {
        setPage((p) => (p + 1) % pageCount);
        setPhase("opening");
      }, CLOSE_TOTAL);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("open"), OPEN_TOTAL);
    return () => clearTimeout(t);
  }, [phase, pageCount, holdMs]);

  /* Selalu MONITOR_PER_PAGE slot: slot kosong di halaman terakhir tetap
     dirender sebagai placeholder agar posisi tiap fleet konsisten. */
  const slots = React.useMemo(() => {
    const start = page * MONITOR_PER_PAGE;
    return Array.from({ length: MONITOR_PER_PAGE }, (_, i) => ({
      fleet: list[start + i],
      order: start + i + 1,
    }));
  }, [list, page]);

  const [now] = React.useState(() => new Date());
  const shift = shiftNow(params.get("shift"), now);
  const cardsPerSlot = useFleetCardsMany(
    slots.map((s) => s.fleet),
    shift,
    now.toISOString().slice(0, 10)
  );

  const flipClass =
    phase === "closing"
      ? "display-flip [animation:kflip-out_360ms_cubic-bezier(.4,0,.9,.3)_both]"
      : phase === "opening"
        ? "display-flip [animation:kflip-in_440ms_cubic-bezier(.12,.72,.3,1)_both]"
        : undefined;

  const first = page * MONITOR_PER_PAGE + 1;
  const last = Math.min(list.length, (page + 1) * MONITOR_PER_PAGE);

  return (
    <DisplayShell
      title={monitor?.name ?? "Display Monitor"}
      meta={
        list.length ? (
          <span className="truncate">
            Halaman <b className="text-(--text-primary)">{page + 1}</b> /{" "}
            {pageCount} · fleet {first}–{last} dari {list.length}
          </span>
        ) : (
          <span>Belum ada fleet yang dipilih untuk monitor ini</span>
        )
      }
      deviceName={deviceName !== monitor?.name ? deviceName : undefined}
      runtext={monitor?.runtext || displayRuntext.fleet}
      /* kosong: angka per fleet sudah ada di tiap kuadran, dan baris stat
         global memakan 118px yang justru dibutuhkan kuadran */
      stats={[]}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* key = halaman: memaksa panel dipasang ulang saat giliran berganti,
            sehingga animasi buka selalu mulai dari nol. Tanpa ini React
            memakai ulang node lama dan panelnya hanya "muncul". */}
        <div
          key={page}
          className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-6 perspective-[2200px]"
        >
          {slots.map((s, i) =>
            s.fleet ? (
              <FleetQuadrant
                key={s.fleet.id}
                fleet={s.fleet}
                cards={cardsPerSlot[i] ?? []}
                order={s.order}
                className={flipClass}
                style={{ animationDelay: `${i * STAGGER_MS}ms` }}
              />
            ) : (
              <EmptyQuadrant
                key={`kosong-${i}`}
                style={{ animationDelay: `${i * STAGGER_MS}ms` }}
              />
            )
          )}
        </div>

        {/* Penunjuk halaman: dari jauh, ini yang memberi tahu kru bahwa fleet
            mereka akan lewat sebentar lagi — tanpa itu layar terbaca seperti
            hanya menampilkan empat fleet yang berubah-ubah sendiri. */}
        {pageCount > 1 ? (
          <div className="flex flex-none items-center justify-center gap-3">
            {Array.from({ length: pageCount }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color] duration-300",
                  i === page
                    ? "w-14 bg-primary"
                    : "w-2.5 bg-(--fill-hover-strong)"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </DisplayShell>
  );
}

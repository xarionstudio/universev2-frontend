"use client";

import * as React from "react";
import { Bus, Pickaxe } from "lucide-react";

import type { DisplayFleetCard } from "@/lib/data/display-screens";
import type { Fleet } from "@/lib/data/fleet";
import { unitLabel } from "@/lib/data/units-db";
import { cn } from "@/lib/utils";

import { FleetUnitCard } from "./fleet-board";

/* Satu kuadran layar monitor = satu formasi fleet dengan kartu berfoto.

   Kartu di kuadran memang jauh lebih kecil dari layar fleet tunggal (~115-278
   x 134 px, dibanding 241x312). Yang menentukan keterbacaan bukan jumlah
   pikselnya melainkan UKURAN FISIK panelnya: pada TV 80 inci, lebar 1920 px
   membentang 177 cm sehingga 1 px = 0,92 mm — kartu 115 px itu selebar ~10,6
   cm dan nama 15 px setinggi ~1,4 cm. Foto operator justru bagian yang paling
   tahan mengecil, karena wajah dikenali tanpa perlu dibaca. */

export function FleetQuadrant({
  fleet,
  cards,
  order,
  className,
  style,
}: {
  fleet: Fleet;
  cards: DisplayFleetCard[];
  /* nomor urut fleet di dalam monitor (1-based) — kru menghafal "fleet 7",
     bukan id internalnya */
  order: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ready = cards.filter((c) => c.tone === "success").length;
  const bd = cards.filter((c) => c.tone === "danger").length;
  const sb = cards.filter((c) => c.tone === "neutral").length;

  /* SELALU 2 baris kartu; yang berubah jumlah kolomnya, mengikuti besar
     formasi. Dengan begitu tinggi kartu tetap (~134px) sementara fleet kecil
     mendapat kartu yang jauh lebih lebar, bukan menyisakan separuh kuadran
     kosong. Kolom dihitung dari jumlah unit, bukan dipatok 7, karena fleet di
     monitor berkisar 5-14 unit. */
  const cols = Math.max(3, Math.ceil(cards.length / 2));

  return (
    <div
      style={style}
      className={cn(
        "flex min-h-0 flex-col gap-2.5 rounded-card border border-(--glass-2-border) bg-(--glass-2-fill) px-4.5 py-3.5",
        bd > 0 && "border-[rgba(252,60,59,.45)]",
        className
      )}
    >
      <div className="flex flex-none items-baseline gap-3">
        <b className="font-mono text-[26px] leading-none font-bold">
          Fleet {order}
        </b>
        <span className="ml-auto truncate text-[17px] text-(--text-secondary)">
          {fleet.loc}
        </span>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--badge-info-border) bg-(--badge-info-fill) px-3 py-0.5 text-[16px] font-bold text-primary-bright">
          <Bus className="size-4" />
          {unitLabel(fleet.bus)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--badge-warning-border) bg-(--badge-warning-fill) px-3 py-0.5 text-[16px] font-bold text-(--badge-warning-text)">
          <Pickaxe className="size-4" />
          {unitLabel(fleet.digger)}
        </span>
        <span className="rounded-full border border-(--badge-neutral-border) bg-(--badge-neutral-fill) px-3 py-0.5 text-[16px] font-semibold text-(--badge-neutral-text)">
          {cards.length} unit · {ready} ready
          {bd ? ` · ${bd} BD` : ""}
          {sb ? ` · ${sb} SB` : ""}
        </span>
      </div>

      <div
        className="grid min-h-0 flex-1 grid-rows-2 gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cards.slice(0, cols * 2).map((c) => (
          <FleetUnitCard key={c.code} card={c} size="compact" />
        ))}
      </div>
    </div>
  );
}

/* Slot kosong di halaman terakhir — sengaja tetap dirender supaya posisi tiap
   fleet tidak bergeser antar-halaman: kru yang tahu fleet-nya muncul di sudut
   kanan bawah tidak perlu memindai ulang seluruh layar tiap 10 detik. */
export function EmptyQuadrant({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className="grid place-items-center rounded-card border border-dashed border-(--divider) bg-[rgba(255,255,255,.02)]"
    >
      <span className="text-[22px] text-(--text-disabled)">—</span>
    </div>
  );
}

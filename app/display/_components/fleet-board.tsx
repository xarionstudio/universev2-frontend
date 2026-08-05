"use client";

import * as React from "react";
import { Bus, Pickaxe, UserX } from "lucide-react";

import {
  fleetDisplayCards,
  type DisplayFleetCard,
} from "@/lib/data/display-screens";
import type { Fleet } from "@/lib/data/fleet";
import { unitLabel } from "@/lib/data/units-db";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { initialsOf } from "@/components/ui/avatar";

import { DisplayBadge } from "./display-table";

/* Papan fleet — bagian layar yang dipakai BERSAMA oleh dua kiosk:
     /display/fleet    → satu formasi, tetap
     /display/monitor  → banyak formasi, bergantian
   Keduanya wajib menampilkan hal yang sama persis; kalau papannya disalin,
   perbaikan pada satu layar diam-diam tidak sampai ke layar satunya. */

/* Shift menurut jam (06:00–17:59 = pagi); bisa dipaksa lewat ?shift= untuk
   pengujian. Dipakai kedua kiosk supaya operator yang tampil sama. */
export function shiftNow(force?: string | null, at: Date = new Date()) {
  if (force === "pagi" || force === "malam") return force;
  return at.getHours() >= 6 && at.getHours() < 18 ? "pagi" : "malam";
}

/* Kartu operator per unit untuk sebuah formasi, dari alokasi harian.
   Dipanggil per fleet, jadi layar monitor tidak menghitung ulang seluruh
   formasi tiap detik — hanya saat fleet yang tayang berganti. */
export function useFleetCards(
  fleet: Fleet | undefined,
  shift: "pagi" | "malam",
  day: string
): DisplayFleetCard[] {
  const { faAlloc, empAll } = useAppStore();
  const nameByNik = React.useMemo(
    () => new Map(empAll().map((e) => [e.nik, e.name])),
    [empAll]
  );
  return React.useMemo(() => {
    if (!fleet) return [];
    const alloc = faAlloc[day]?.[shift] ?? {};
    return fleetDisplayCards(fleet, alloc, (nik) => nameByNik.get(nik));
  }, [fleet, faAlloc, day, shift, nameByNik]);
}

/* Versi jamak — layar monitor menampilkan 4 formasi sekaligus, dan hook tidak
   boleh dipanggil di dalam perulangan. Satu useMemo untuk seluruh halaman:
   kartunya hanya dihitung ulang saat halaman berganti, bukan tiap detik. */
export function useFleetCardsMany(
  fleets: (Fleet | undefined)[],
  shift: "pagi" | "malam",
  day: string
): DisplayFleetCard[][] {
  const { faAlloc, empAll } = useAppStore();
  const nameByNik = React.useMemo(
    () => new Map(empAll().map((e) => [e.nik, e.name])),
    [empAll]
  );
  /* kunci stabil: array `fleets` dibuat baru tiap render, jadi memakainya
     langsung sebagai dependency akan menghitung ulang tanpa henti */
  const key = fleets.map((f) => f?.id ?? "-").join(",");
  return React.useMemo(() => {
    const alloc = faAlloc[day]?.[shift] ?? {};
    return fleets.map((f) =>
      f ? fleetDisplayCards(f, alloc, (nik) => nameByNik.get(nik)) : []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, faAlloc, day, shift, nameByNik]);
}

export function toneCount(cards: DisplayFleetCard[], tone: string) {
  return cards.filter((c) => c.tone === tone).length;
}

/* Baris identitas fleet: lokasi + bus jemputan + leader excavator.
   Dua chip ini adalah pertanyaan pertama kru tiap pagi ("bus mana?",
   "loading ke mana?"), jadi keduanya diberi bobot visual chip, bukan teks
   biasa yang tenggelam di sebelah nama lokasi. */
export function FleetIdentity({
  fleet,
  compact,
}: {
  fleet: Fleet;
  compact?: boolean;
}) {
  return (
    <>
      <span className="truncate">{fleet.loc}</span>
      <span
        className={cn(
          "inline-flex flex-none items-center gap-2.5 rounded-full border border-(--badge-info-border) bg-(--badge-info-fill) font-bold text-primary-bright",
          compact ? "px-3.5 py-0.5" : "px-4.5 py-1"
        )}
      >
        <Bus className={compact ? "size-5" : "size-6"} />
        menaiki {unitLabel(fleet.bus)}
      </span>
      <span
        className={cn(
          "inline-flex flex-none items-center gap-2.5 rounded-full border border-(--badge-warning-border) bg-(--badge-warning-fill) font-bold text-(--badge-warning-text)",
          compact ? "px-3.5 py-0.5" : "px-4.5 py-1"
        )}
      >
        <Pickaxe className={compact ? "size-5" : "size-6"} />
        loading ke {unitLabel(fleet.digger)}
      </span>
    </>
  );
}

/* Kartu operator satu unit — foto memenuhi kartu, teks di atas scrim.

   SATU komponen untuk dua layar dengan dua ukuran, bukan dua salinan:
     "full"    layar fleet tunggal, kartu 241x312
     "compact" kuadran layar monitor, kartu ~115-278 x 134
   Kalau markup-nya disalin, perbaikan pada satu layar diam-diam tidak sampai
   ke layar satunya — dan justru bagian inilah (foto + nama + status) yang
   paling sering diminta berubah. */
export function FleetUnitCard({
  card: c,
  size = "full",
  className,
  style,
}: {
  card: DisplayFleetCard;
  size?: "full" | "compact";
  className?: string;
  style?: React.CSSProperties;
}) {
  const full = size === "full";
  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden border border-(--glass-2-border)",
        full ? "rounded-card" : "rounded-xl",
        c.tone === "danger" &&
          "border-[rgba(252,60,59,.55)] shadow-[0_0_28px_rgba(252,60,59,.25)]",
        className
      )}
    >
      {/* foto karyawan memenuhi kartu (placeholder inisial sampai aset foto
          tersedia — lihat field `foto` di Employee) */}
      {c.opName ? (
        <div className="absolute inset-0 grid place-items-center bg-(image:--gradient-cta)">
          <span
            className={cn(
              "font-bold text-on-cta opacity-80",
              full ? "text-[88px]" : "text-[44px]"
            )}
          >
            {initialsOf(c.opName)}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-(--fill-input)">
          <UserX
            className={cn(
              "text-(--text-disabled)",
              full ? "size-20" : "size-9"
            )}
          />
        </div>
      )}
      {/* scrim agar teks terbaca di atas foto */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,22,.65)_0%,rgba(1,4,22,0)_32%,rgba(1,4,22,0)_52%,rgba(1,4,22,.88)_100%)]" />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between",
          full ? "p-3.5" : "p-2"
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <b
            className={cn(
              "font-mono font-bold tabular-nums",
              full ? "text-[22px]" : "text-[15px]"
            )}
          >
            {c.code}
          </b>
          {/* Di kartu ringkas hanya TITIK status, bukan lencana berteks:
              "Breakdown" pada kartu selebar 115px memakan seluruh baris dan
              mendorong kode unit keluar. Labelnya tetap muncul di baris nama
              saat unit tidak beroperasi, jadi tidak ada informasi yang hilang. */}
          {full ? (
            <DisplayBadge
              tone={c.tone}
              className="gap-1.5 px-2.5 py-0.5 text-sm [&>span]:size-2"
            >
              {c.label}
            </DisplayBadge>
          ) : (
            <span
              className={cn(
                "mt-1 size-2.5 flex-none rounded-full",
                TONE_DOT[c.tone] ?? TONE_DOT.neutral
              )}
            />
          )}
        </div>
        <div>
          {/* Dua baris di kartu ringkas. Kartu tersempit (7 kolom) hanya
              menyisakan ~99px untuk nama — cukup ~11 huruf, sehingga
              "Arnoldus Marak Lewar" terpotong jadi "Arnoldus M…". Tingginya
              masih longgar (134px), jadi nama dipatahkan ke baris kedua
              alih-alih dibuang. */}
          <div
            className={cn(
              "leading-tight font-bold",
              full ? "line-clamp-1 text-[21px]" : "line-clamp-2 text-[15px]"
            )}
          >
            {c.opName ?? (full ? "Belum ada operator" : c.label)}
          </div>
          {c.opNik ? (
            <div
              className={cn(
                "mt-0.5 font-mono text-(--text-secondary) tabular-nums",
                full ? "text-base" : "text-[12px]"
              )}
            >
              {c.opNik}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const TONE_DOT: Record<string, string> = {
  success: "bg-success",
  danger: "bg-danger",
  neutral: "bg-(--text-disabled)",
  warning: "bg-warning",
  info: "bg-primary",
};

/* Grid kartu operator — maks. 14 (digger + 13 OHT), tanpa auto-scroll.
   `cardClassName` & `cardStyle` dipakai layar monitor untuk menempelkan
   animasi buka/tutup per kartu; layar fleet tunggal membiarkannya kosong. */
export function FleetCardGrid({
  cards,
  cardClassName,
  cardStyle,
}: {
  cards: DisplayFleetCard[];
  cardClassName?: string;
  cardStyle?: (index: number) => React.CSSProperties | undefined;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-2 gap-5 perspective-[1600px]">
      {cards.slice(0, 14).map((c, i) => (
        <FleetUnitCard
          key={c.code}
          card={c}
          style={cardStyle?.(i)}
          className={cardClassName}
        />
      ))}
    </div>
  );
}

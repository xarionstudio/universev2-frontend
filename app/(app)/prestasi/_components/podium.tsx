"use client";

import Link from "next/link";
import { Crown, Flame } from "lucide-react";

import type { PrestasiEntry } from "@/lib/data/prestasi";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/* Podium tiga besar. Urutan visual 2 · 1 · 3 seperti podium sungguhan:
   juara di tengah dan paling tinggi. Di layar sempit ditumpuk 1 · 2 · 3
   supaya urutan bacanya tetap masuk akal. */

const ORDER = [1, 0, 2]; // indeks entri untuk kolom kiri, tengah, kanan

export function Podium({ top }: { top: PrestasiEntry[] }) {
  const { t } = useI18n();
  if (!top.length) return null;

  return (
    <div className="grid grid-cols-3 items-end gap-4 max-md:grid-cols-1 max-md:items-stretch">
      {ORDER.map((idx, col) => {
        const e = top[idx];
        if (!e) return <div key={col} className="max-md:hidden" />;
        const first = e.rank === 1;
        return (
          <div
            key={e.nik}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-panel px-5 pt-8 pb-6 text-center glass-card",
              // juara lebih tinggi & diberi cincin cyan
              first
                ? "pt-11 pb-8 shadow-[0_0_0_1px_rgba(0,212,255,.45),var(--shadow-card-glow)] max-md:order-first"
                : "mb-4 max-md:mb-0",
              col === 0 ? "max-md:order-2" : col === 2 ? "max-md:order-3" : ""
            )}
          >
            {/* mahkota juara */}
            {first ? (
              <Crown
                className="absolute -top-3.5 left-1/2 size-7 -translate-x-1/2 text-(--badge-warning-text)"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}

            {/* nomor peringkat */}
            <span
              className={cn(
                "absolute top-3 left-3 grid size-7 place-items-center rounded-full text-xs font-bold tabular-nums",
                first
                  ? "bg-(image:--gradient-cta) text-on-cta"
                  : "border border-(--glass-2-border) bg-(--fill-subtle) text-(--text-secondary)"
              )}
            >
              {e.rank}
            </span>

            <Avatar
              src={e.foto}
              alt={e.name}
              className={cn(
                "text-xl",
                first
                  ? "size-28 shadow-[0_0_0_3px_var(--color-primary),0_0_28px_rgba(0,212,255,.45)] max-md:size-24"
                  : "size-20 max-md:size-16"
              )}
            >
              {initialsOf(e.name)}
            </Avatar>

            <div className="flex min-w-0 flex-col gap-0.5">
              {/* nama membuka jejak audit poin operator ini */}
              <Link
                href={`/prestasi/${e.nik}`}
                className={cn(
                  "truncate font-bold text-inherit hover:text-primary-bright",
                  first ? "text-lg" : "text-base"
                )}
                title={e.name}
              >
                {e.name}
              </Link>
              <span className="truncate text-xs text-(--text-tertiary)">
                {e.pos}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "font-mono font-bold tabular-nums",
                  first
                    ? "bg-(image:--gradient-cta) bg-clip-text text-[32px] text-transparent"
                    : "text-2xl text-primary-bright"
                )}
              >
                {e.points}
              </span>
              <span className="text-[11px] tracking-(--tracking-brand) text-(--text-tertiary) uppercase">
                {t.prPts}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              <Badge variant="info">
                {e.qualifiedDays} {t.prQualified}
              </Badge>
              {e.bestStreak > 1 ? (
                <Badge variant="warning">
                  <Flame className="size-3" />
                  {e.bestStreak} {t.prDays}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

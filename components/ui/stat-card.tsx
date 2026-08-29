import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* Kartu statistik G2 (stat) — opsional tautan dengan panah pojok */
function StatCard({
  href,
  icon,
  iconStyle,
  value,
  label,
  detail,
  className,
}: {
  href?: string;
  icon: React.ReactNode;
  iconStyle: { background: string; borderColor: string; color: string };
  value: React.ReactNode;
  label: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      {href ? (
        <span className="absolute top-3.5 right-3.5 grid size-6.5 place-items-center rounded-lg border border-(--glass-1-border) bg-(--fill-subtle) group-hover:border-[rgba(0,212,255,.4)] group-hover:bg-[rgba(0,212,255,.16)]">
          <ArrowUpRight className="size-3.25 text-(--text-tertiary) group-hover:text-primary-bright" />
        </span>
      ) : null}
      {/* Ikon dan angka+label SEBARIS — versi bertumpuk menyisakan separuh
          kanan kartu kosong dan kartunya dua kali lebih tinggi dari isinya.
          pr-7 menyisakan jalur untuk panah pojok saat label panjang. */}
      <div
        className={cn(
          "flex items-center gap-3.5 max-sm:gap-2.5",
          href && "pr-7"
        )}
      >
        <div
          className="grid size-11 flex-none place-items-center rounded-icon border max-sm:size-9 [&_svg]:size-5 max-sm:[&_svg]:size-4"
          style={{
            background: iconStyle.background,
            borderColor: iconStyle.borderColor,
            color: iconStyle.color,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          {/* Angka 28px: sebaris dengan badge 44px, blok angka+label pas
              setinggi badge — 32px membuat blok lebih tinggi dari badge dan
              barisnya tampak miring. */}
          <div className="text-[28px] leading-tight font-bold tabular-nums max-sm:text-[22px]">
            {value}
          </div>
          <div className="text-sm leading-snug text-(--text-secondary) max-sm:text-[13px]">
            {label}
          </div>
        </div>
      </div>
      {detail ? (
        <div className="mt-2.5 text-xs text-(--text-tertiary) [&_b]:font-semibold [&_b]:text-(--text-primary)">
          {detail}
        </div>
      ) : null}
    </>
  );

  const baseClass = cn(
    "relative block rounded-card p-4 glass-card transition-[border-color,box-shadow,transform] duration-150 max-sm:p-3.5",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          baseClass,
          "group text-inherit no-underline hover:-translate-y-0.5 hover:border-[rgba(0,212,255,.45)] hover:text-inherit hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
}

export { StatCard };

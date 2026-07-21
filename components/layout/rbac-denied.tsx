"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { useI18n } from "@/lib/i18n";

/* Ditampilkan saat user sudah login tapi role-nya tidak punya permission untuk
   halaman ini. Sengaja halaman penuh, bukan redirect diam-diam, supaya user
   tahu kenapa dan tidak mengira aplikasinya rusak. */
export function RbacDenied({ reason }: { reason?: string }) {
  const { t } = useI18n();
  return (
    <div className="grid flex-1 place-items-center py-20">
      <div className="flex max-w-110 flex-col items-center gap-4 text-center">
        <div className="grid size-14 place-items-center rounded-full border border-(--badge-warning-border) bg-(--badge-warning-fill)">
          <ShieldAlert className="size-7 text-warning" strokeWidth={1.6} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-bold">{t.rbacDeniedT}</h2>
          <p className="text-sm leading-relaxed text-(--text-secondary)">
            {reason ?? t.rbacDeniedB}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-control bg-(image:--gradient-cta) px-5 text-sm font-bold text-on-cta no-underline shadow-(--glow-cta) hover:bg-(image:--gradient-cta-hover) hover:no-underline"
        >
          {t.rbacDeniedBack}
        </Link>
      </div>
    </div>
  );
}

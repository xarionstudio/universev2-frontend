"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  displayKomp,
  ftwBadgeOf,
  validKomp,
  type FaOp,
  type FaUnit,
} from "./fa";

/* Dialog alokasi operator — baris operator dengan alasan blokir */
export function AllocDialog({
  unit,
  ops,
  alloc,
  onClose,
  onAssign,
}: {
  unit: FaUnit | null;
  ops: FaOp[];
  alloc: Record<string, string>;
  onClose: () => void;
  onAssign: (op: FaOp) => void;
}) {
  const { t } = useI18n();
  /* pilihan direset per unit lewat prop `key` di pemanggil */
  const [sel, setSel] = React.useState<string | null>(null);

  const selOp = sel ? ops.find((o) => o.nik === sel) : undefined;

  return (
    <Dialog open={!!unit} onClose={onClose} labelledBy="fa-t">
      <DialogIcon variant="info">
        <UserPlus />
      </DialogIcon>
      <DialogTitle id="fa-t">
        {t.faAssignT} {unit?.code}
      </DialogTitle>
      <DialogBody>{t.faDlgB}</DialogBody>
      <div className="mt-4 flex flex-col gap-1">
        {unit
          ? ops.map((o) => {
              const match = displayKomp(o, unit.tegi);
              const valid = validKomp(o, unit.tegi);
              const busyCode = Object.entries(alloc).find(
                ([code, nik]) => nik === o.nik && code !== unit.code
              )?.[0];
              const blocked = !valid || o.ftw !== "fit" || !!busyCode;
              const ftw = ftwBadgeOf(o, t);
              let sub = match
                ? `${match.cls} · SIMPER ${match.simper}`
                : t.faKompNone;
              if (busyCode) sub += ` · ${t.faBusy} (${busyCode})`;
              return (
                <div
                  key={o.nik}
                  role="button"
                  aria-disabled={blocked || undefined}
                  onClick={() => {
                    if (!blocked) setSel(o.nik);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-icon border border-transparent px-3 py-2",
                    blocked
                      ? "cursor-not-allowed opacity-55"
                      : "cursor-pointer hover:bg-(--fill-hover)",
                    sel === o.nik &&
                      "border-[rgba(0,212,255,.4)] bg-[rgba(0,212,255,.1)]"
                  )}
                >
                  <Avatar className="size-[30px] text-[11px]">
                    {initialsOf(o.name)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13px] font-semibold">{o.name}</b>
                    <span className="text-xs text-(--text-tertiary)">
                      {sub}
                    </span>
                  </div>
                  <Badge variant={ftw.variant} dot>
                    {ftw.label}
                  </Badge>
                </div>
              );
            })
          : null}
      </div>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {t.btnCancel}
        </Button>
        <Button
          disabled={!selOp}
          onClick={() => {
            if (selOp) onAssign(selOp);
          }}
        >
          {t.faAssign}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

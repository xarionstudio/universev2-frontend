"use client"

import * as React from "react"
import { CircleAlert, Wand2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogIcon,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/ui/dialog"
import { validKomp, todayIso, type FaOp, type FaUnit } from "./fa"

export type FaProposal = {
  code: string
  nik: string
  name: string
  type: string
  komp: string
}

type Skipped = { name: string; why: string }

/* Dialog preview auto-alokasi — usulan + daftar yang dilewati */
export function AutoDialog({
  open,
  units,
  ops,
  alloc,
  onClose,
  onApply,
}: {
  open: boolean
  units: FaUnit[]
  ops: FaOp[]
  alloc: Record<string, string>
  onClose: () => void
  onApply: (proposals: FaProposal[]) => void
}) {
  const { t } = useI18n()

  const { proposals, skipped } = React.useMemo(() => {
    const proposals: FaProposal[] = []
    const skipped: Skipped[] = []
    if (!open) return { proposals, skipped }
    const busy = new Set(Object.values(alloc))
    const freeOps = ops.filter((o) => !busy.has(o.nik))
    const freeUnits = units.filter((u) => u.status === "ready" && !alloc[u.code])
    const taken = new Set<string>()
    const today = todayIso()
    /* operator kompetensi tunggal ditempatkan lebih dulu */
    const ordered = [...freeOps].sort(
      (a, b) => (a.komp?.length ?? 0) - (b.komp?.length ?? 0)
    )
    for (const op of ordered) {
      if (op.ftw === "belum") {
        skipped.push({ name: op.name, why: t.faWhyBelum })
        continue
      }
      if (op.ftw === "kurang") {
        skipped.push({ name: op.name, why: t.ftwStatKurang })
        continue
      }
      const unit = freeUnits.find(
        (u) => !taken.has(u.code) && validKomp(op, u.tegi)
      )
      if (unit) {
        taken.add(unit.code)
        const k = validKomp(op, unit.tegi)!
        proposals.push({
          code: unit.code,
          nik: op.nik,
          name: op.name,
          type: unit.type,
          komp: k.cls,
        })
      } else {
        const hasValid = (op.komp || []).some((k) => !k.exp || k.exp >= today)
        skipped.push({ name: op.name, why: hasValid ? t.faWhyNoUnit : t.faWhyKomp })
      }
    }
    return { proposals, skipped }
  }, [open, units, ops, alloc, t])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="w-[min(600px,100%)]"
      labelledBy="faauto-t"
    >
      <DialogIcon variant="info">
        <Wand2 />
      </DialogIcon>
      <DialogTitle id="faauto-t">{t.faAutoT}</DialogTitle>
      <DialogBody>{t.faAutoB}</DialogBody>

      {proposals.length ? (
        <div className="mt-4 flex max-h-[300px] flex-col gap-1 overflow-y-auto">
          {proposals.map((p) => (
            <div
              key={p.code}
              className="flex items-center gap-3 rounded-icon px-3 py-2"
            >
              <b className="w-[76px] flex-none font-mono text-[13px]">{p.code}</b>
              <div className="min-w-0 flex-1">
                <b className="block text-[13px] font-semibold">{p.name}</b>
                <span className="text-xs text-(--text-tertiary)">
                  {p.type} · {p.komp}
                </span>
              </div>
              <Badge variant="success" dot>
                Fit
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-control border border-(--badge-danger-border) bg-(--badge-danger-fill) px-4 py-3 text-sm leading-normal text-(--color-danger-text)">
          <CircleAlert className="mt-0.5 size-4 flex-none" />
          <span>{t.faAutoNone}</span>
        </div>
      )}

      {skipped.length ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase">
            {t.faAutoSkipT}
          </div>
          <div className="flex flex-col gap-0.5">
            {skipped.map((sk) => (
              <div key={sk.name} className="flex gap-2 py-1 text-sm">
                <span className="font-medium">{sk.name}</span>
                <span className="text-(--text-tertiary)">— {sk.why}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {t.btnCancel}
        </Button>
        {proposals.length ? (
          <Button onClick={() => onApply(proposals)}>
            {t.faAutoApplyBtn} ({proposals.length})
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}

"use client";

import * as React from "react";
import { Wand2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button, Spinner } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";

/* Dialog konfirmasi auto-alokasi.

   Mesin usulan sisi-klien yang lama DIHAPUS: server-lah yang menyusun
   alokasi (POST /api/fleet/allocations/auto) dan menegakkan aturan MVP —
   SIMPER Type EGI cocok + punya data hadir + punya data Jam Tidur — sehingga
   klien tidak boleh punya matematika kelayakan tandingan yang bisa berbeda
   hasil. Dialog ini tinggal menjelaskan akibatnya dengan jujur (alokasi
   tanggal+shift DIGANTI seluruhnya) lalu meminta konfirmasi. */
export function AutoDialog({
  open,
  date,
  shiftLabel,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  date: string;
  shiftLabel: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="w-[min(560px,100%)]"
      labelledBy="faauto-t"
    >
      <DialogIcon variant="warning">
        <Wand2 />
      </DialogIcon>
      <DialogTitle id="faauto-t">
        {t.faAutoT} — {date} · {shiftLabel}
      </DialogTitle>
      <DialogBody>{t.faAutoConfirmB}</DialogBody>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          {t.btnCancel}
        </Button>
        <Button disabled={saving} onClick={onConfirm}>
          {saving ? <Spinner /> : null}
          {t.faAutoRun}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

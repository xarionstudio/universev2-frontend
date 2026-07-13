"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
} from "lucide-react";

import { displayFtwRowsNow, displayRuntext } from "@/lib/data/display-screens";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

export default function DisplayFitworkPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  /* baris + statistik diturunkan dari log tidur — sinkron dengan admin */
  const rows = React.useMemo(() => displayFtwRowsNow(), []);
  const n = (label: string) => rows.filter((r) => r.label === label).length;
  return (
    <DisplayShell
      title="Fit To Work — Shift Pagi"
      deviceName={deviceName}
      runtext={displayRuntext.ftw}
      stats={[
        {
          icon: <ClipboardCheck className="text-(--color-primary-bright)" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: String(n("Fit") + n("Kurang tidur")),
          label: "Sudah Lapor",
        },
        {
          icon: <CheckCircle2 className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: String(n("Fit")),
          label: "Fit",
        },
        {
          icon: <Clock className="text-(--badge-warning-text)" />,
          iconClass:
            "bg-(--badge-warning-fill) border-(--badge-warning-border)",
          value: String(n("Belum lapor")),
          label: "Belum Lapor",
        },
        {
          icon: <AlertTriangle className="text-(--color-danger-text)" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(n("Kurang tidur")),
          label: "Kurang Tidur",
        },
      ]}
    >
      <DisplayTable
        cols={[
          { label: "NIK", width: "11%" },
          { label: "Nama", width: "18%" },
          { label: "Posisi", width: "14%" },
          { label: "Departemen", width: "11%" },
          { label: "Status", width: "13%" },
          { label: "Log Tidur", width: "12%" },
          { label: "Note" },
        ]}
        rows={rows.map((r) => ({
          key: r.nik,
          danger: r.tone === "danger",
          cells: [
            <span
              key="k"
              className="font-mono text-(--text-secondary) tabular-nums"
            >
              {r.nik}
            </span>,
            <b key="n" className="font-bold">
              {r.name}
            </b>,
            r.pos,
            r.dept,
            <DisplayBadge key="s" tone={r.tone}>
              {r.label}
            </DisplayBadge>,
            <span key="sl" className="font-mono whitespace-nowrap tabular-nums">
              {r.sleep}
            </span>,
            <span key="no" className="text-xl text-(--text-secondary)">
              {r.note}
            </span>,
          ],
        }))}
      />
    </DisplayShell>
  );
}

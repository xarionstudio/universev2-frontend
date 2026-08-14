"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
} from "lucide-react";

import { displayApi } from "@/lib/api/display";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

export default function DisplayFitworkPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  const { mdData } = useAppStore();
  const [apiRows, setApiRows] = React.useState<Record<string, unknown>[]>([]);
  const runtextOpts = mdData?.runtext || [];
  const runtext =
    runtextOpts.find(
      (r) => r.active && r.targetDisplay === "Display Attendance"
    )?.name ??
    runtextOpts.find((r) => r.active)?.name ??
    "Rapat P5M setiap pergantian shift di front masing-masing.";

  // Ensure runtext is always a string
  const safeRuntext =
    runtext || "Rapat P5M setiap pergantian shift di front masing-masing.";

  React.useEffect(() => {
    displayApi
      .getDisplayFTW()
      .then((res) => {
        if (res && Array.isArray(res))
          setApiRows(res as Record<string, unknown>[]);
      })
      .catch(() => {});
  }, []);

  /* baris + statistik diturunkan dari log tidur API — sinkron dengan admin */
  const rows = React.useMemo(
    () =>
      apiRows.map((r) => {
        const st = String(r.st || r.status || "belum");
        return {
          nik: String(r.nik || ""),
          name: String(r.name || r.nik || ""),
          pos: String(r.pos || ""),
          dept: String(r.dept || ""),
          sleep: String(r.sleep || r.sleepHours || "—"),
          rest: r.restHours ? `${r.restHours} jam` : "—",
          label:
            st === "fit"
              ? "Fit"
              : st === "spare"
                ? "Kurang tidur"
                : st === "pulang"
                  ? "Dipulangkan"
                  : "Belum lapor",
          variant: (st === "fit"
            ? "success"
            : st === "spare"
              ? "warning"
              : "neutral") as "success" | "warning" | "neutral",
          tone: (st === "fit"
            ? "success"
            : st === "spare"
              ? "warning"
              : "neutral") as "success" | "warning" | "neutral" | "danger",
          note: String(
            r.note || (r.restHours ? `Istirahat ${r.restHours} jam` : "—")
          ),
        };
      }),
    [apiRows]
  );
  const n = (label: string) => rows.filter((r) => r.label === label).length;
  return (
    <DisplayShell
      title="Fit To Work — Shift Pagi"
      deviceName={deviceName}
      runtext={safeRuntext}
      stats={[
        {
          icon: <ClipboardCheck className="text-primary-bright" />,
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
          icon: <AlertTriangle className="text-danger-text" />,
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

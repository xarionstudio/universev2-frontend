import type { Employee, Komp } from "@/lib/data/employees";
import type { FtwStatus } from "@/lib/data/ftw";
import type { Dict } from "@/lib/i18n/id";
import type { BadgeVariant } from "@/components/ui/badge";

/* Unit papan alokasi — turunan Database Unit (unit aktif saja) */
export type FaUnit = {
  code: string;
  type: string;
  loc: string;
  tegi: string;
  status: "ready" | "breakdown" | "standby";
};

/* Operator = karyawan aktif ber-kompetensi + status FTW hari ini */
export type FaOp = Employee & { ftw: FtwStatus };

export function todayIso() {
  // WITA (UTC+8) date — avoid "yesterday" bug at 00:00–07:59 local time
  const wita = new Date(Date.now() + 8 * 3600000);
  return wita.toISOString().slice(0, 10);
}

/* Kompetensi yang cocok utk Type EGI unit — SIMPER masih berlaku */
export function validKomp(op: FaOp, tegi: string): Komp | null {
  const today = todayIso();
  return (
    (op.komp || []).find((k) => k.cls === tegi && (!k.exp || k.exp >= today)) ||
    null
  );
}

/* Kompetensi tampilan (tanpa cek expiry) */
export function displayKomp(op: FaOp, tegi: string): Komp | null {
  return (op.komp || []).find((k) => k.cls === tegi) || null;
}

export function ftwBadgeOf(
  op: FaOp,
  t: Dict
): { variant: BadgeVariant; label: string } {
  if (op.ftw === "fit") return { variant: "success", label: "Fit" };
  /* spare masih boleh dialokasikan, tapi baru setelah istirahat tambahan */
  if (op.ftw === "spare") return { variant: "warning", label: t.ftwStatSpare };
  if (op.ftw === "pulang") return { variant: "danger", label: t.ftwStatPulang };
  return { variant: "neutral", label: t.ftwStatBelum };
}

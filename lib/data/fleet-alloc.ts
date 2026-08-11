/* Alokasi operator→unit per TANGGAL + SHIFT — pengganti file setting-operator
   bulanan (30 sheet Excel). Bentuk: alloc[tanggalISO][shift][kodeUnit] = nik */
export type FaShift = "pagi" | "malam";
export type FaAlloc = Record<
  string,
  Partial<Record<FaShift, Record<string, string>>>
>;

export function isoAddDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

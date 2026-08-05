import * as React from "react";

import { cn } from "@/lib/utils";

/* Tabel data (dt) — thead gradient, baris ber-divider, hover halus.

   Tabel SELALU dibungkus wadah bergulir sendiri. Tanpa ini, tabel 6-8 kolom
   (header-nya whitespace-nowrap) melebar melewati panel di layar sempit;
   karena `body { overflow-x: hidden }` kelebihannya bukan digulirkan melainkan
   TERPOTONG — kolom terakhir jadi tidak pernah bisa dibaca di ponsel. Wadahnya
   di sini, bukan di 24 pemanggil, supaya tidak ada tabel yang terlewat.

   overscroll-x-contain: gulir mentok di tabel tidak merambat jadi navigasi
   "geser untuk kembali" di browser ponsel. */
function Table({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"table"> & { wrapperClassName?: string }) {
  return (
    <div
      data-slot="table-wrap"
      className={cn(
        "w-full max-w-full overflow-x-auto overscroll-x-contain",
        wrapperClassName
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_th]:bg-(image:--gradient-thead) [&_th:first-child]:rounded-l-control [&_th:last-child]:rounded-r-control",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-(--text-primary) uppercase",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({
  className,
  selected,
  ...props
}: React.ComponentProps<"tr"> & { selected?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "transition-colors duration-100 hover:bg-(--fill-subtle)",
        selected &&
          "bg-[rgba(0,212,255,.08)] [&_td]:border-b-[rgba(0,212,255,.2)]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-b border-(--divider) px-4 py-3 align-middle",
        className
      )}
      {...props}
    />
  );
}

/* Sel nama dua baris: nama tebal + sub mono kecil (dt .name) */
function NameCell({
  name,
  sub,
  className,
}: {
  name: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  /* whitespace-nowrap: begitu tabel bisa digulir, memeras kolom nama sampai
     "First Angel Paustine" pecah jadi tiga baris tidak menghemat apa pun —
     itu hanya memindahkan sesaknya dari sumbu X ke sumbu Y. */
  return (
    <span className={cn("block whitespace-nowrap", className)}>
      <b className="block font-semibold">{name}</b>
      {sub !== undefined && sub !== "" ? (
        <span className="font-mono text-xs text-(--text-tertiary)">{sub}</span>
      ) : null}
    </span>
  );
}

/* Sel check-in/out: jam mono tebal + mesin kecil (cellio) */
function IOCell({ time, machine }: { time?: string; machine?: string }) {
  if (!time) return <span className="text-(--text-tertiary)">—</span>;
  return (
    <span>
      <b className="block font-mono font-semibold tabular-nums">{time}</b>
      {machine ? (
        <span className="text-xs text-(--text-tertiary)">{machine}</span>
      ) : null}
    </span>
  );
}

export {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  NameCell,
  IOCell,
};

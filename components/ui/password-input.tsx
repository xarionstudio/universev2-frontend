"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/* Input password dengan tombol lihat/sembunyikan.
   Diangkat dari profile/page-client.tsx (dulu privat di berkas itu) supaya
   halaman User Management memakai kontrol yang sama persis.
   Catatan API: onChange menerima string, bukan event — mengikuti pemakaian
   yang sudah ada di halaman profil. */
function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  toggleLabel = "Tampilkan password",
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  toggleLabel?: string;
  className?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={toggleLabel}
        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-(--text-tertiary) hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-primary"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };

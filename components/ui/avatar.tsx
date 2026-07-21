import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/* Avatar inisial dengan gradient cyan + ring.
   Bila `src` diisi, fotonya yang tampil; kalau tidak, kembali ke inisial —
   halaman pemanggil tidak perlu tahu ada foto atau tidak. */
function Avatar({
  className,
  children,
  src,
  alt,
  ...props
}: React.ComponentProps<"span"> & { src?: string; alt?: string }) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative grid size-9 place-items-center overflow-hidden rounded-full bg-(image:--gradient-cta) text-[13px] font-bold text-on-cta shadow-[0_0_0_2px_var(--ring-avatar)]",
        className
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes="160px"
          className="object-cover"
        />
      ) : (
        children
      )}
    </span>
  );
}

/* Ambil inisial dua kata pertama */
export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export { Avatar };

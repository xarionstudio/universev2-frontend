"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";

/* Logo resmi UNIVERSE (public/logoV1.svg) — pengganti huruf "U" dummy.
   Bila companyLogo di settings diisi, logo tersebut yang dipakai. */
function UniverseLogo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  const { companyLogo } = useAppStore();
  const src = companyLogo || "/logoV1.svg";
  return (
    <Image
      src={src}
      alt="UNIVERSE"
      width={60}
      height={60}
      priority={priority}
      unoptimized={!!companyLogo}
      className={cn("flex-none", className)}
    />
  );
}

/* Lingkaran kaca ber-ring glow dengan logo di tengah — avatar auth & kiosk */
function LogoBadge({
  className,
  logoClassName,
}: {
  className?: string;
  logoClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid flex-none place-items-center rounded-full border border-(--glass-2-border) bg-(--glass-2-fill) shadow-[0_0_0_3px_var(--ring-avatar),0_0_28px_rgba(0,212,255,.4)] backdrop-blur-md",
        className
      )}
    >
      <UniverseLogo className={logoClassName} />
    </div>
  );
}

export { UniverseLogo, LogoBadge };

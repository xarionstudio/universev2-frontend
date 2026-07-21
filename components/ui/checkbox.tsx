"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* Checkbox kit kontrol — 16px, centang dibuat dengan pseudo-border */
function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "relative size-4 flex-none cursor-pointer appearance-none rounded border-[1.5px] border-(--border-input) bg-(--fill-input) transition-colors",
        "checked:border-primary checked:bg-primary",
        "checked:after:absolute checked:after:top-0.5 checked:after:right-[3.5px] checked:after:bottom-0.5 checked:after:left-[3.5px] checked:after:-translate-y-px checked:after:-rotate-45 checked:after:border-0 checked:after:border-b-2 checked:after:border-l-2 checked:after:border-solid checked:after:border-on-cta checked:after:content-['']",
        "indeterminate:border-primary indeterminate:bg-primary indeterminate:after:absolute indeterminate:after:top-1.5 indeterminate:after:right-0.75 indeterminate:after:left-0.75 indeterminate:after:h-0.5 indeterminate:after:bg-on-cta indeterminate:after:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/* Baris toggle: checkbox + label satu baris */
function ToggleRow({
  className,
  children,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="toggle-row"
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Checkbox, ToggleRow };

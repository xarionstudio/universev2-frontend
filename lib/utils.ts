import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Trigger browser download untuk Blob (mis. file Excel/CSV dari API). */
export function downloadBlob(
  blob: Blob,
  filename: string,
  fallbackType?: string
) {
  const mime = blob.type || fallbackType || "application/octet-stream";
  const fixed = new Blob([blob], { type: mime });
  const url = URL.createObjectURL(fixed);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

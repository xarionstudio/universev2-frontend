import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve backend-hosted asset URLs (e.g. "/uploads/photos/x.jpg")
 * to an absolute URL the browser can load from the API host.
 * Leaves data:, blob:, http(s):, and public paths like "/logoV1.svg" alone.
 */
export function assetUrl(path?: string | null): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  // Backend static files live under /uploads on the API host
  if (path.startsWith("/uploads")) {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
    // strip trailing /api so we get http://host:port
    const origin = apiBase.replace(/\/api\/?$/, "");
    return `${origin}${path}`;
  }
  return path;
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

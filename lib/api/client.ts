/* Satu-satunya pintu keluar HTTP ke backend Go.

   Tanggung jawabnya empat, dan sengaja tidak lebih:
     1. menempelkan base URL + kredensial (Bearer token dan cookie),
     2. membuka amplop { success, message, data } jadi `data` saja,
     3. menyeragamkan SEMUA kegagalan menjadi ApiError,
     4. sekali coba refresh token saat 401, lalu ulangi permintaannya.

   Yang TIDAK dikerjakan di sini: cache, dedup, dan retry selain butir 4.
   Halaman memanggilnya langsung; kalau nanti dibungkus SWR/React Query,
   lapisan ini tetap jadi fetcher-nya tanpa perlu diubah. */

import { ApiError } from "./error";
import { clearSession, getToken, setSession } from "./session-store";
import type { ApiEnvelope, ApiErrorBody, AuthPayload } from "./types";

/* Dibaca saat modul dimuat. NEXT_PUBLIC_ wajib: nilainya di-inline ke bundel
   browser saat build, jadi mengubahnya menuntut restart `pnpm dev`.

   Bawaannya RELATIF ("/api"), bukan http://localhost:8080/api. Permintaan
   karena itu pergi ke origin halaman ini sendiri, lalu diteruskan ke backend
   oleh rewrite di next.config.ts. Tiga masalah produksi hilang sekaligus:
   CORS tidak pernah ikut bermain, situs HTTPS tidak pernah memanggil backend
   HTTP (mixed content), dan cookie `jwt` menjadi same-origin.

   Bentuk absolut masih dihormati bila variabelnya disetel — berguna saat
   frontend sengaja dijalankan terpisah dari backend — tetapi itu berarti
   menerima kembali ketiga masalah di atas. */
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(
  /\/+$/,
  ""
);

export function apiBaseUrl(): string {
  return BASE;
}

/* Backend menyajikan file unggahan di /uploads, DI LUAR grup /api. Foto
   karyawan & logo datang sebagai path relatif, jadi butuh akar berbeda.

   Dengan BASE relatif ("/api") hasilnya string kosong, sehingga assetUrl()
   menghasilkan "/uploads/..." — persis yang dibutuhkan: berkas tetap diminta
   dari origin halaman lalu diteruskan rewrite ke backend, dan optimizer gambar
   Next yang mengambilnya dari sisi server ikut menemukan jalan yang benar. */
export function apiOrigin(): string {
  return BASE.replace(/\/api$/, "");
}

/* Path relatif dari backend (mis. "uploads/photo/x.jpg") menjadi URL penuh.
   URL absolut dibiarkan apa adanya supaya aman dipakai untuk kedua bentuk. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiOrigin()}/${path.replace(/^\/+/, "")}`;
}

/* ── Query string ────────────────────────────────────────────────────── */

export type QueryValue = string | number | boolean | null | undefined;

/* null/undefined/string kosong dibuang, bukan dikirim kosong: sebagian
   handler backend memperlakukan parameter kosong sebagai filter yang memang
   diminta, sehingga hasilnya jadi kosong tanpa sebab yang jelas. */
export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* ── Reaksi terhadap sesi yang tidak lagi berlaku ────────────────────── */

let onUnauthenticated: (() => void) | null = null;

/* Didaftarkan oleh SessionProvider. Lewat callback, bukan impor langsung ke
   router, supaya modul ini tetap bisa dipakai di luar React. */
export function setUnauthenticatedHandler(fn: (() => void) | null): void {
  onUnauthenticated = fn;
}

function giveUpSession() {
  clearSession();
  onUnauthenticated?.();
}

/* ── Inti permintaan ─────────────────────────────────────────────────── */

type RequestInitLite = {
  method?: string;
  query?: Record<string, QueryValue>;
  /* Objek biasa dikirim sebagai JSON. FormData dikirim apa adanya — browser
     yang menetapkan boundary multipart, dan menyetel Content-Type sendiri
     justru merusaknya. */
  body?: unknown;
  signal?: AbortSignal;
  /* Lewati auto-refresh saat 401. Dipakai endpoint auth itu sendiri agar
     login yang gagal tidak memicu putaran refresh. */
  noRetry?: boolean;
  /* Endpoint publik: 401 dari sini BUKAN berarti sesi mati — jangan bersihkan
     sesi apalagi melempar pengguna ke /login. Contoh nyata: /auth/page-config
     dipanggil pengunjung tanpa sesi dari halaman register; backend versi lama
     menjawab 401 (middleware auth menangkap rute /api yang tak dikenal), dan
     tanpa flag ini pengunjung terpental dari /register ke /login. */
  publicEndpoint?: boolean;
};

function buildHeaders(body: unknown): Headers {
  const h = new Headers({ Accept: "application/json" });
  if (body !== undefined && !(body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

function serialize(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

async function rawFetch(
  path: string,
  init: RequestInitLite
): Promise<Response> {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}${suffix}${buildQuery(init.query)}`;
  try {
    return await fetch(url, {
      method: init.method ?? "GET",
      headers: buildHeaders(init.body),
      body: serialize(init.body),
      /* Ikut mengirim cookie httpOnly `jwt` milik backend. Dengan BASE relatif
         permintaannya same-origin, jadi cookie terkirim tanpa bergantung pada
         tafsir SameSite sama sekali. Tetap ditulis eksplisit supaya bentuk
         absolut (frontend dijalankan lepas dari backend) juga tetap bekerja. */
      credentials: "include",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (e) {
    /* fetch hanya melempar bila permintaannya tidak pernah selesai: server
       mati, DNS gagal, offline, atau preflight CORS ditolak. Status 0 dipakai
       sebagai penanda "tidak ada jawaban sama sekali", dibedakan dari 5xx. */
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "Tidak dapat terhubung ke server. Pastikan backend berjalan.",
      0,
      { url }
    );
  }
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    /* Bukan JSON — mis. panic yang lolos ke luar, atau halaman error proxy. */
    return { message: text.slice(0, 300) };
  }
}

function toApiError(res: Response, body: unknown, url: string): ApiError {
  const b = (body ?? {}) as ApiErrorBody;
  /* `b.error` adalah bentuk pendek dari middleware auth & RBAC yang tidak
     lewat pkg/response; tanpa cabang ini, 401/403 tampil tanpa pesan. */
  const message =
    b.message || b.error || `Permintaan gagal (HTTP ${res.status})`;
  return new ApiError(message, res.status, {
    fieldErrors: b.errors ?? [],
    body: b,
    url,
  });
}

/* ── Refresh token, sekali jalan bersama ─────────────────────────────── */

let inFlightRefresh: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    noRetry: true,
  });
  if (!res.ok) return false;
  const body = (await readBody(res)) as ApiEnvelope<AuthPayload> | undefined;
  const data = body?.data;
  if (!data?.token || !data.user) return false;
  setSession({ token: data.token, user: data.user, perms: data.perms ?? {} });
  return true;
}

/* Saat token kedaluwarsa, banyak permintaan bisa kena 401 berbarengan. Tanpa
   penggabungan ini masing-masing akan memanggil /auth/refresh sendiri dan
   saling menimpa token hasilnya. */
export function refreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh()
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

/* ── API publik ──────────────────────────────────────────────────────── */

/* Mengembalikan isi `data` dari amplop. Endpoint yang memang tidak
   mengembalikan apa pun (logout, update profil) menghasilkan undefined —
   panggil dengan tipe `void`. */
export async function request<T>(
  path: string,
  init: RequestInitLite = {}
): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && !init.noRetry && !init.publicEndpoint) {
    const ok = await refreshSession();
    if (ok) res = await rawFetch(path, init);
    else giveUpSession();
  }

  const body = await readBody(res);

  if (!res.ok) {
    if (res.status === 401 && !init.publicEndpoint) giveUpSession();
    throw toApiError(res, body, path);
  }

  const env = body as ApiEnvelope<T> | undefined;
  /* Sebagian handler menjawab 200 dengan success:false alih-alih status 4xx.
     Diperlakukan sebagai kegagalan supaya pemanggil tidak menerima data
     kosong yang tampak sah. */
  if (env && env.success === false) {
    throw new ApiError(env.message || "Permintaan gagal", res.status, {
      body: env as ApiErrorBody,
      url: path,
    });
  }
  return env?.data as T;
}

export const api = {
  get: <T>(
    path: string,
    query?: Record<string, QueryValue>,
    signal?: AbortSignal
  ) => request<T>(path, { method: "GET", query, signal }),

  post: <T>(path: string, body?: unknown, query?: Record<string, QueryValue>) =>
    request<T>(path, { method: "POST", body, query }),

  put: <T>(path: string, body?: unknown, query?: Record<string, QueryValue>) =>
    request<T>(path, { method: "PUT", body, query }),

  patch: <T>(
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>
  ) => request<T>(path, { method: "PATCH", body, query }),

  del: <T>(path: string, query?: Record<string, QueryValue>, body?: unknown) =>
    request<T>(path, { method: "DELETE", query, body }),
};

/* Endpoint ekspor mengirim file Excel, bukan amplop JSON — jadi tidak boleh
   lewat request<T>() yang selalu mencoba mengurai JSON. */
export async function requestBlob(
  path: string,
  query?: Record<string, QueryValue>
): Promise<Blob> {
  let res = await rawFetch(path, { method: "GET", query });

  if (res.status === 401) {
    const ok = await refreshSession();
    if (ok) res = await rawFetch(path, { method: "GET", query });
    else giveUpSession();
  }

  if (!res.ok) throw toApiError(res, await readBody(res), path);
  return res.blob();
}

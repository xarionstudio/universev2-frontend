/* Penyimpanan sesi login — sengaja TANPA React.

   Dipakai dua pihak yang tidak boleh saling bergantung:
     - lib/api/client.ts  : butuh token saat menyusun header, di luar render.
     - providers/session  : butuh sumber yang bisa di-subscribe useSyncExternalStore.
   Kalau token disimpan di dalam context React, client.ts terpaksa mengimpor
   React dan lahir impor melingkar. Karena itu kebenarannya tinggal di sini,
   dan React hanya berlangganan.

   CATATAN KEAMANAN: token disimpan di localStorage, jadi terbaca skrip yang
   berhasil masuk ke halaman (XSS). Backend juga menaruh token yang sama di
   cookie httpOnly `jwt` (lihat handler/auth.go) dan menerima keduanya, jadi
   cookie itulah lapisan yang lebih aman. localStorage dipertahankan karena
   frontend berjalan di origin berbeda (:3000 vs :8080) dan header Authorization
   adalah jalur yang paling tidak bergantung pada kebijakan cookie browser.
   Bila nanti keduanya dilayani satu origin, penyimpanan ini bisa dibuang dan
   cukup bersandar pada cookie. */

import type { ApiPermMap, ApiUser } from "./types";

const KEY = "universe-session";

/* Kunci lama: berisi email polos sebagai penanda "sudah login" di masa
   prototipe. Nilainya tidak bisa dipakai lagi (bukan token), jadi dibersihkan
   supaya sesi palsu peninggalan mock tidak membuat aplikasi mengira sudah
   login lalu ditolak backend di panggilan pertama. */
const LEGACY_KEY = "universe-auth";

export type StoredSession = {
  token: string;
  user: ApiUser;
  perms: ApiPermMap;
};

/* ── Siaran perubahan ─────────────────────────────────────────────────

   Event `storage` bawaan browser HANYA menyala di tab lain, jadi perubahan
   dari tab ini disiarkan manual. Keduanya dipasang agar logout di satu tab
   ikut menendang tab lain. */
let listeners: Array<() => void> = [];

function emit() {
  for (const l of listeners) l();
}

export function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

/* ── Baca ─────────────────────────────────────────────────────────────

   Snapshot di-cache dan hanya diurai ulang saat string mentahnya berubah.
   Ini syarat useSyncExternalStore: mengembalikan objek baru tiap panggilan
   akan membuat React menganggap store berubah terus dan render tanpa henti. */
let cachedRaw: string | null = null;
let cachedSnapshot: StoredSession | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredSession>;
    /* Token kosong = tidak ada sesi. Bentuk lain yang cacat (mis. sisa versi
       lama) diperlakukan sama: lebih baik dianggap belum login daripada
       membawa objek setengah jadi ke seluruh aplikasi. */
    if (!v || typeof v.token !== "string" || !v.token || !v.user) return null;
    return {
      token: v.token,
      user: v.user as ApiUser,
      perms: (v.perms ?? {}) as ApiPermMap,
    };
  } catch {
    return null;
  }
}

export function getSession(): StoredSession | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parse(raw);
  }
  return cachedSnapshot;
}

/* Snapshot server: di SSR tidak ada sesi. Harus konstanta yang sama tiap
   panggilan — sekali lagi demi useSyncExternalStore. */
export function getServerSession(): StoredSession | null {
  return null;
}

/* Dipakai client.ts saat menyusun header Authorization. */
export function getToken(): string | null {
  return getSession()?.token ?? null;
}

/* ── Tulis ────────────────────────────────────────────────────────── */

export function setSession(next: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* Mode privat/kuota penuh: sesi tetap hidup di memori untuk tab ini. */
    cachedRaw = JSON.stringify(next);
    cachedSnapshot = next;
  }
  emit();
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* diabaikan — snapshot di bawah tetap dikosongkan */
  }
  cachedRaw = null;
  cachedSnapshot = null;
  emit();
}

/* Perbarui hanya token (hasil refresh) tanpa menyentuh user/perms. */
export function setToken(token: string): void {
  const cur = getSession();
  if (!cur) return;
  setSession({ ...cur, token });
}

/* Perbarui sebagian data user — mis. setelah profil disimpan — tanpa
   memaksa login ulang. */
export function patchUser(patch: Partial<ApiUser>): void {
  const cur = getSession();
  if (!cur) return;
  setSession({ ...cur, user: { ...cur.user, ...patch } });
}

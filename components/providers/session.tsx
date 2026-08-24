"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  authApi,
  clearSession,
  getServerSession,
  getSession,
  patchUser,
  setSession,
  setUnauthenticatedHandler,
  subscribeSession,
  usersApi,
  type ApiPermMap,
  type ApiRole,
  type ApiUser,
  type LoginBody,
} from "@/lib/api";

/* Sesi login — sekarang benar-benar dari backend.

   Sebelumnya berkas ini hanya menyimpan email di localStorage sebagai penanda
   "sudah login", tanpa ada yang memverifikasi apa pun. Sekarang isinya token
   JWT dari POST /api/auth/login berikut user dan permission efektif yang
   dihitung server dari tabel role_permissions.

   Pembagian tugasnya:
     lib/api/session-store  menyimpan & menyiarkan {token, user, perms}
     berkas ini             menjalankan alur login/logout/refresh + role
     providers/permissions  menurunkannya jadi jawaban can()

   `hydrated` tetap dipertahankan dengan arti yang sama seperti dulu: false
   selama render server dan hydrate pertama, karena localStorage belum boleh
   dibaca di sana. Layout memakainya untuk menunda keputusan redirect. */

const serverFalse = () => false;
const clientTrue = () => true;

/* Referensi tetap untuk keadaan "belum ada permission". Objek literal baru
   tiap render akan membuat useMemo di bawah dianggap berubah terus. */
const NO_PERMS: ApiPermMap = {};

type SessionCtx = {
  /* Email akun yang login; null = belum login. Dipertahankan sebagai field
     tersendiri karena beberapa halaman hanya butuh ini. */
  email: string | null;
  token: string | null;
  user: ApiUser | null;
  /* Permission mentah dari backend (nama modul apa adanya). Konversi ke
     PermMap frontend dilakukan usePermissions(), bukan di sini. */
  perms: ApiPermMap;
  /* Daftar role lengkap — hanya terisi bila akun punya permission
     `users:view`. Kosong untuk role biasa, dan itu bukan kegagalan. */
  roles: ApiRole[];
  /* false selama render server/hydrate — jangan ambil keputusan redirect. */
  hydrated: boolean;
  login: (body: LoginBody) => Promise<void>;
  logout: () => Promise<void>;
  /* Menyegarkan token, user, dan perms dari server. */
  refresh: () => Promise<void>;
  /* Menambal user lokal setelah profil disimpan, tanpa login ulang. */
  applyUserPatch: (patch: Partial<ApiUser>) => void;
};

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  /* useSyncExternalStore, bukan useEffect+setState: localStorage adalah sumber
     data di luar React, dan primitif ini yang memang untuk itu — aman terhadap
     SSR sekaligus ikut memantau perubahan dari tab lain (logout di satu tab
     menendang tab lainnya). */
  const stored = React.useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession
  );
  const hydrated = React.useSyncExternalStore(
    subscribeSession,
    clientTrue,
    serverFalse
  );

  const [roles, setRoles] = React.useState<ApiRole[]>([]);

  const token = stored?.token ?? null;
  const user = stored?.user ?? null;
  const perms = stored?.perms ?? NO_PERMS;

  /* Daftar role dipakai untuk menampilkan NAMA role (topbar, profil) dan untuk
     mengenali role terkunci = Superadmin. Endpoint-nya di balik permission
     `users:view`, jadi 403 adalah jawaban yang wajar untuk role biasa dan
     diserap menjadi daftar kosong — bukan error yang ditampilkan. */
  const loadRoles = React.useCallback(async () => {
    try {
      setRoles(await usersApi.listRoles());
    } catch {
      setRoles([]);
    }
  }, []);

  /* Sesi yang ditolak server: bersihkan lalu antar ke halaman login.
     Didaftarkan sebagai callback supaya lib/api tidak perlu tahu soal router.
     Ref-guard dipakai agar unmount pertama pada StrictMode tidak mencabut
     handler milik mount kedua. */
  const handlerRef = React.useRef<(() => void) | null>(null);
  React.useEffect(() => {
    const handler = () => {
      setRoles([]);
      router.replace("/login");
    };
    handlerRef.current = handler;
    setUnauthenticatedHandler(handler);
    return () => {
      if (handlerRef.current === handler) setUnauthenticatedHandler(null);
    };
  }, [router]);

  const refresh = React.useCallback(async () => {
    const data = await authApi.refresh();
    setSession({
      token: data.token,
      user: data.user,
      perms: data.perms ?? {},
    });
    await loadRoles();
  }, [loadRoles]);

  /* Saat aplikasi dimuat ulang, token di localStorage bisa saja sudah dicabut
     atau permission pemiliknya berubah. Sekali panggil refresh memastikan
     keduanya mutakhir. Kegagalannya sengaja didiamkan: kalau token benar-benar
     tidak berlaku, panggilan API berikutnya akan menerima 401 dan handler di
     atas yang mengantar ke /login — tidak perlu menendang pengguna hanya
     karena backend sedang mati. */
  const bootstrapped = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || bootstrapped.current) return;
    bootstrapped.current = true;
    if (!getSession()) return;

    /* Ditulis sebagai IIFE async dengan penanda `alive`, bukan memanggil
       refresh() langsung: state hanya disentuh SETELAH await, dan tidak
       disentuh sama sekali bila provider keburu dilepas. */
    let alive = true;
    void (async () => {
      try {
        const data = await authApi.refresh();
        if (!alive) return;
        setSession({
          token: data.token,
          user: data.user,
          perms: data.perms ?? {},
        });
      } catch {
        /* Token bisa saja sudah kedaluwarsa, atau backend sedang mati.
           Keduanya tidak perlu menendang pengguna dari sini: panggilan API
           berikutnya akan menerima 401 dan handler di atas yang mengantar ke
           /login. */
        return;
      }
      const list = await usersApi.listRoles().catch(() => []);
      if (!alive) return;
      setRoles(list);
    })();

    return () => {
      alive = false;
    };
  }, [hydrated]);

  const login = React.useCallback(
    async (body: LoginBody) => {
      const data = await authApi.login(body);
      setSession({
        token: data.token,
        user: data.user,
        perms: data.perms ?? {},
      });
      await loadRoles();
    },
    [loadRoles]
  );

  const logout = React.useCallback(async () => {
    /* Cookie `jwt` hanya bisa dihapus server, jadi endpoint-nya tetap
       dipanggil — tapi kegagalannya tidak boleh menahan logout lokal.
       Pengguna yang menekan "keluar" harus keluar, backend hidup atau tidak. */
    try {
      await authApi.logout();
    } catch {
      /* diabaikan dengan sengaja */
    }
    clearSession();
    setRoles([]);
    router.replace("/login");
  }, [router]);

  const applyUserPatch = React.useCallback((patch: Partial<ApiUser>) => {
    patchUser(patch);
  }, []);

  const value = React.useMemo<SessionCtx>(
    () => ({
      email: user?.email ?? null,
      token,
      user,
      perms,
      roles,
      hydrated,
      login,
      logout,
      refresh,
      applyUserPatch,
    }),
    [
      user,
      token,
      perms,
      roles,
      hydrated,
      login,
      logout,
      refresh,
      applyUserPatch,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = React.useContext(Ctx);
  if (!v)
    throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  return v;
}

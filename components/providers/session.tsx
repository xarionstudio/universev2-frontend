"use client";

import * as React from "react";

/* Identitas sesi — email akun yang sedang login.
   Sebelumnya email ini hanya ditulis ke localStorage oleh halaman login dan
   dibaca sebagai boolean "sudah login atau belum"; siapa yang login tidak
   pernah dipakai (profil memakai konstanta SESSION_UID = "u1"). Provider ini
   menjadikannya satu sumber kebenaran sehingga RBAC punya subjek yang jelas.

   localStorage dibaca lewat useSyncExternalStore, bukan useEffect+setState:
   itu memang primitif untuk sumber data di luar React, aman terhadap SSR,
   dan sekaligus ikut memantau perubahan dari tab lain.

   Tetap localStorage karena belum ada backend — lihat catatan di lib/rbac.ts
   soal kenapa ini bukan penegakan keamanan. */

const KEY = "universe-auth";

/* Pelanggan lokal: perubahan dari tab ini tidak memicu event `storage`
   (event itu hanya untuk tab lain), jadi disiarkan manual. */
let listeners: Array<() => void> = [];

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

function readEmail(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/* Di server tidak ada sesi; nilai ini juga dipakai saat hydrate pertama */
const serverEmail = () => null;
const serverFalse = () => false;
const clientTrue = () => true;

type SessionCtx = {
  /* null = belum login (atau sesi belum terbaca — cek `hydrated` dulu) */
  email: string | null;
  /* false selama render server/hydrate — jangan ambil keputusan redirect dulu */
  hydrated: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
};

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const email = React.useSyncExternalStore(subscribe, readEmail, serverEmail);
  const hydrated = React.useSyncExternalStore(
    subscribe,
    clientTrue,
    serverFalse
  );

  const signIn = React.useCallback((next: string) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    emit();
  }, []);

  const signOut = React.useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    emit();
  }, []);

  const value = React.useMemo(
    () => ({ email, hydrated, signIn, signOut }),
    [email, hydrated, signIn, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = React.useContext(Ctx);
  if (!v)
    throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  return v;
}

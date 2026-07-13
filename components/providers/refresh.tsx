"use client";

import * as React from "react";

/* refresh global di topbar — berlaku untuk halaman apa pun yang sedang
   dibuka. Halaman boleh mendaftarkan handler-nya sendiri (skeleton,
   stempel "data per", dsb) lewat useRegisterRefresh; tanpa handler,
   tombol tetap berputar sebentar sebagai simulasi muat ulang. */

type RefreshHandler = () => void | Promise<void>;

type RefreshCtxValue = {
  refreshing: boolean;
  refresh: () => Promise<void>;
  register: (fn: RefreshHandler) => () => void;
};

const RefreshCtx = React.createContext<RefreshCtxValue | null>(null);

/* jeda minimum agar spinner terlihat walau handler halaman sinkron */
const MIN_SPIN_MS = 600;

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = React.useState(false);
  const handlerRef = React.useRef<RefreshHandler | null>(null);
  const busyRef = React.useRef(false);

  const register = React.useCallback((fn: RefreshHandler) => {
    handlerRef.current = fn;
    return () => {
      if (handlerRef.current === fn) handlerRef.current = null;
    };
  }, []);

  const refresh = React.useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try {
      await Promise.all([
        handlerRef.current?.(),
        new Promise((r) => setTimeout(r, MIN_SPIN_MS)),
      ]);
    } finally {
      busyRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const value = React.useMemo(
    () => ({ refreshing, refresh, register }),
    [refreshing, refresh, register]
  );

  return <RefreshCtx.Provider value={value}>{children}</RefreshCtx.Provider>;
}

export function useRefresh() {
  const ctx = React.useContext(RefreshCtx);
  if (!ctx) throw new Error("useRefresh must be inside RefreshProvider");
  return ctx;
}

/* dipanggil dari page-client: handler aktif selama halaman terpasang */
export function useRegisterRefresh(fn: RefreshHandler) {
  const { register } = useRefresh();
  const ref = React.useRef(fn);
  React.useEffect(() => {
    ref.current = fn;
  });
  React.useEffect(() => register(() => ref.current()), [register]);
}

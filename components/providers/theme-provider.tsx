"use client";

import * as React from "react";

/* "system" = OTOMATIS: ikut cuaca yang sedang terbaca, dan jatuh ke preferensi
   OS hanya bila cuaca belum diketahui (di luar shell admin, atau fetch pertama
   belum selesai).

   Tidak ada pilihan menu "Ikut cuaca" tersendiri. Menambah opsi keempat
   membuat dua hal yang bagi operator terasa sama ("otomatis") berdiri
   berdampingan di satu menu pendek. Sebaliknya, MENGHAPUS mode cuaca dari menu
   sambil menjadikannya default akan menciptakan jalan buntu: begitu operator
   sekali menekan Terang atau Gelap, ia tidak punya cara kembali ke perilaku
   otomatis. Menyatukannya ke "System" menyelesaikan keduanya.

   Pilihan eksplisit Terang/Gelap tetap MENANG atas cuaca — kalau tidak, tombol
   tema di header jadi tombol yang diam-diam tidak bekerja. */
export type ThemePref = "system" | "light" | "dark";
export type ThemeResolved = "light" | "dark";

type ThemeContextValue = {
  pref: ThemePref;
  resolved: ThemeResolved;
  setTheme: (pref: ThemePref) => void;
  /* Dipanggil HANYA oleh <WeatherTheme> di dalam shell admin. null = cuaca
     belum diketahui (atau di luar shell), sehingga "system" sementara memakai
     preferensi OS. */
  setWeatherHint: (t: ThemeResolved | null) => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  pref: "system",
  resolved: "dark",
  setTheme: () => {},
  setWeatherHint: () => {},
});

const KEY = "universe-theme";
/* Tema cuaca terakhir disimpan supaya skrip pra-paint di app/layout.tsx bisa
   memakainya. Tanpa ini, halaman selalu terbuka dengan tema sistem lalu
   berkedip ke tema cuaca sepersekian detik kemudian. */
const KEY_WX = "universe-theme-wx";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = React.useState<ThemePref>("system");
  const [resolved, setResolved] = React.useState<ThemeResolved>("dark");
  const wxRef = React.useRef<ThemeResolved | null>(null);

  const apply = React.useCallback((p: ThemePref) => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const sys: ThemeResolved = mq.matches ? "light" : "dark";
    const t: ThemeResolved =
      p === "light" || p === "dark" ? p : (wxRef.current ?? sys);
    document.documentElement.setAttribute("data-theme", t);
    setResolved(t);
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => {
      let saved: ThemePref = "system";
      try {
        const raw = localStorage.getItem(KEY);
        /* "weather" pernah jadi nilai tersimpan di versi sebelumnya; sekarang
           artinya sudah menyatu ke "system". */
        saved =
          raw === "light" || raw === "dark" ? (raw as ThemePref) : "system";
        const wx = localStorage.getItem(KEY_WX);
        if (wx === "light" || wx === "dark") wxRef.current = wx;
      } catch {}
      setPref(saved);
      apply(saved);
    }, 0);
    return () => clearTimeout(id);
  }, [apply]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply(pref);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref, apply]);

  const setTheme = React.useCallback(
    (p: ThemePref) => {
      setPref(p);
      try {
        localStorage.setItem(KEY, p);
      } catch {}
      apply(p);
    },
    [apply]
  );

  const setWeatherHint = React.useCallback(
    (t: ThemeResolved | null) => {
      if (wxRef.current === t) return;
      wxRef.current = t;
      try {
        if (t) localStorage.setItem(KEY_WX, t);
      } catch {}
      /* Hanya berdampak saat tema masih otomatis. setPref dipakai sebagai
         pembaca nilai terkini (bukan untuk mengubahnya) agar callback ini
         tidak perlu bergantung pada `pref` — kalau bergantung, identitasnya
         berubah tiap ganti tema dan efek pemanggilnya ikut berjalan ulang. */
      setPref((cur) => {
        if (cur === "system") apply("system");
        return cur;
      });
    },
    [apply]
  );

  const value = React.useMemo(
    () => ({ pref, resolved, setTheme, setWeatherHint }),
    [pref, resolved, setTheme, setWeatherHint]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

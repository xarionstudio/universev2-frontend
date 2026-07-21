/* Preferensi "efek cuaca aktif/mati" — store eksternal mungil.

   Kenapa bukan useState + useEffect: membaca localStorage lalu setState di
   dalam badan useEffect dilarang React Compiler, dan membacanya saat render
   tidak SSR-safe. useSyncExternalStore menyelesaikan keduanya sekaligus:
   snapshot server selalu `true`, snapshot klien dibaca sekali lalu di-cache.

   File ini TIDAK menyentuh window di module scope. */

const KEY = "universe.weather-effects";

let cache: boolean | null = null;
const listeners = new Set<() => void>();

/* Snapshot klien. HARUS mengembalikan nilai yang sama secara referensial
   selama tidak ada perubahan — boolean primitif, jadi aman. */
export function getWeatherEffectsSnapshot(): boolean {
  if (cache !== null) return cache;
  try {
    cache = window.localStorage.getItem(KEY) !== "off";
  } catch {
    /* localStorage diblokir (mode privat / kebijakan perangkat) */
    cache = true;
  }
  return cache;
}

/* Snapshot server & hidrasi pertama: efek dianggap aktif. */
export function getWeatherEffectsServerSnapshot(): boolean {
  return true;
}

export function subscribeWeatherEffects(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function setWeatherEffectsEnabled(next: boolean): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    /* preferensi tidak persisten — tetap berlaku untuk sesi ini */
  }
  for (const l of listeners) l();
}

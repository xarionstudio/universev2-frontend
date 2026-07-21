/* Lapisan efek cuaca di belakang seluruh shell admin.
 *
 * Komponen ini MURNI presentasional: tanpa state, tanpa effect, tanpa fetch,
 * tanpa Math.random dan tanpa Date.now. Semua posisi di-hardcode persis
 * seperti DepthScene halaman auth — nilai acak saat render akan berbeda
 * antara server dan klien lalu memicu hydration mismatch.
 *
 * ANGGARAN KINERJA — inilah bagian terpenting dari file ini.
 *
 * Biaya yang mengikat BUKAN jumlah node, melainkan LUAS PIKSEL YANG BERUBAH
 * DI BAWAH KACA. Scene ini fixed di z-0 dan seluruh konten shell (sidebar,
 * topbar, ~10 panel/StatCard) memakai backdrop-filter blur(12-25px). Setiap
 * piksel scene yang berubah membatalkan cache blur SEMUA permukaan kaca di
 * atasnya, memaksa gaussian blur ulang selebar layar — 60x per detik,
 * selamanya, di laptop tambang ber-GPU terintegrasi. `contain` pada scene
 * TIDAK menolong: containment membatasi apa yang dipengaruhi subtree ini,
 * bukan apa yang dibaca ulang oleh backdrop-filter di atasnya.
 *
 * Karena itu:
 *   1. HANYA hujan yang bergerak. Cerah, mendung, kabut, dan malam cerah
 *      dirender STATIS. Pada durasi 46-120s gerakannya di bawah ambang
 *      persepsi (sinar matahari bergerak 0,4px per frame) — jadi biayanya
 *      nyata sementara manfaatnya nol. Menghapusnya membuat halaman idle
 *      kembali ke 0 frame/detik untuk kondisi yang PALING SERING terjadi di
 *      Balikpapan.
 *   2. Saat hujan/badai aktif, WeatherLayer menstempel data-wx="motion" di
 *      <html> dan globals.css mematikan backdrop-filter kaca, menggantinya
 *      dengan isian token yang lebih pekat. Blur per-frame hilang total dan
 *      panel justru jadi lebih terbaca di atas goresan air.
 *   3. Tidak ada filter/blur/box-shadow yang dianimasikan. Kelembutan
 *      berasal dari radial-gradient & mask yang dicat sekali.
 *   4. will-change hanya menempel pada kelas yang benar-benar beranimasi
 *      (.animate-rain-fall), bukan di badan @utility — supaya promosi
 *      lapisan ikut hilang saat efeknya tidak jalan, termasuk di bawah
 *      prefers-reduced-motion.
 *
 * TIDAK ADA KILATAN PETIR. Sinyal petir adalah informasi operasional
 * (stop work) dan disampaikan di kartu dashboard sebagai chip danger + teks,
 * bukan sebagai kedipan luminance di penglihatan tepi yang bersaing dengan
 * kosakata alarm sungguhan dan tidak bisa di-acknowledge.
 *
 * Degradasi: kind "unknown" tidak pernah sampai ke sini (WeatherLayer yang
 * menyaring), tapi tetap dijaga di sini juga -> null, nol elemen.
 */

import type { CSSProperties } from "react";

import type { WeatherIntensity, WeatherKind } from "@/lib/weather/open-meteo";

/* Ketiganya WAJIB. Tanpa default, kabel yang cuma mengoper `kind` menjadi
   error kompilasi alih-alih diam-diam merender gerimis sekencang hujan
   sedang dan malam seterang siang. */
type WeatherSceneProps = {
  kind: WeatherKind;
  intensity: WeatherIntensity;
  isDay: boolean;
};

/* Peredup global malam, dibaca lewat var(--weather-dim) oleh tiap utility. */
const NIGHT_DIM = 0.65;

/* ------------------------------------------------------------------ *
 * Hujan — satu-satunya efek yang bergerak
 * ------------------------------------------------------------------ */

/* DUA lapisan, bukan tiga. Lapisan ketiga proposal awal beralfa 0,12 x
   pengali intensitas 0,55 x dim 0,65 = ~0,04 di balik blur 12px: tidak bisa
   terselesaikan oleh mata, tapi tetap membayar satu tekstur penuh + satu
   render surface (karena mask) + satu animasi per frame.
 *
 * Kemiringan DITURUNKAN ke 8°/6° (dari 15°/12°). Alasannya dua-duanya
 * kinerja dan kualitas gambar: overhang rotasi tumbuh dengan sin(θ) dan
 * itulah yang dulu membengkakkan tiap lapisan jadi 1,8x tinggi viewport;
 * garis rambut 1px yang diputar jauh juga di-resample beda tiap frame
 * sehingga berkedip seperti bug render. Hujan tropis memang hampir tegak.
 *
 * gap  = jarak antar kolom tetesan (px) — sengaja tidak harmonik satu sama
 *        lain maupun dengan irama baris tabel (~48px) supaya tidak moire
 * span = tinggi satu petak mask = jarak tempuh satu siklus (px)
 * len  = panjang goresan di dalam petak (px)
 * tilt = kemiringan lapisan (deg, maks 8 — lihat --rain-over-* di CSS) */
const RAIN_LAYERS = [
  { gap: 37, span: 118, len: 30, tilt: 8, alpha: 0.3, dur: 0.68 },
  { gap: 23, span: 86, len: 20, tilt: 6, alpha: 0.18, dur: 0.95 },
] as const;

/* Pengali alfa & durasi per intensitas. */
const RAIN_TUNE: Record<WeatherIntensity, { alpha: number; speed: number }> = {
  none: { alpha: 0.55, speed: 1.5 },
  light: { alpha: 0.55, speed: 1.5 },
  moderate: { alpha: 1, speed: 1 },
  heavy: { alpha: 1.35, speed: 0.72 },
};

/* ------------------------------------------------------------------ *
 * Awan & kabut — statis
 * ------------------------------------------------------------------ */

const CLOUDS = [
  { top: "-14%", left: "4%", size: "42rem", alpha: 1 },
  { top: "16%", left: "56%", size: "36rem", alpha: 0.8 },
  { top: "-22%", left: "32%", size: "50rem", alpha: 0.6 },
] as const;

const FOG_BANDS = [
  { top: "15%", height: "13rem", alpha: 1 },
  { top: "42%", height: "19rem", alpha: 0.75 },
  { top: "70%", height: "15rem", alpha: 0.9 },
] as const;

/* ------------------------------------------------------------------ *
 * Komponen
 * ------------------------------------------------------------------ */

function WeatherScene({ kind, intensity, isDay }: WeatherSceneProps) {
  if (kind === "unknown") return null;

  const wet = kind === "rain" || kind === "storm";
  /* Hujan & badai selalu berawan; mendung jelas berawan. Kabut tidak —
     pita kabutnya sudah mengisi layar. */
  const clouds = kind === "cloud" ? CLOUDS : wet ? CLOUDS.slice(0, 2) : [];
  const tune = RAIN_TUNE[intensity];

  return (
    <div
      className="weather-scene"
      aria-hidden
      style={{ "--weather-dim": isDay ? 1 : NIGHT_DIM } as CSSProperties}
    >
      {/* ---- Cerah, siang ----
              BUKAN cakram kuning dan BUKAN sinar berputar. Palet aplikasi
              ini dingin, dan #e99b2a adalah hue "warning" yang dipakai di
              seluruh badge/StatCard — menuangkannya di belakang navigasi
              setengah hari kerja akan membuat cuaca cerah terbaca sebagai
              peringatan sistem. Jadi "cerah" = kejernihan: satu bloom dingin
              beralfa sangat rendah, ditambatkan di ATAS KOLOM KONTEN
              (left 34%), bukan di kiri-atas tempat sidebar berdiri. Satu-
              satunya piksel hangat di layar adalah ikon matahari 44px di
              kartu dashboard. ---- */}
      {kind === "sun" && isDay ? <div className="weather-sky" /> : null}

      {/* ---- Cerah, malam ----
              Bulan + dua lapis bintang, STATIS (dua lapisan penuh-viewport
              yang berdenyut opacity adalah pemicu re-blur kaca paling mahal
              dengan imbalan paling kecil). Di tema TERANG kedua token
              --weather-star/--weather-moon bernilai transparent, sehingga
              tidak ada bintik navy gelap di atas langit pucat — pola yang
              akan dibaca sebagai debu di monitor atau dead pixel, bukan
              sebagai cuaca. ---- */}
      {kind === "sun" && !isDay ? (
        <>
          <div className="weather-moon" />
          <div className="weather-stars-a" />
          <div className="weather-stars-b" />
        </>
      ) : null}

      {/* ---- Awan (statis) ---- */}
      {clouds.map((c, i) => (
        <div
          key={`cloud-${i}`}
          className="weather-cloud"
          style={
            {
              top: c.top,
              left: c.left,
              width: c.size,
              height: c.size,
              /* di balik hujan awannya diredupkan supaya goresan air tetap
                 jadi elemen yang terbaca */
              "--cloud-alpha": wet ? c.alpha * 0.7 : c.alpha,
            } as CSSProperties
          }
        />
      ))}

      {/* ---- Hujan (satu-satunya yang bergerak) ---- */}
      {wet
        ? RAIN_LAYERS.map((l, i) => (
            <div
              key={`rain-${i}`}
              className="weather-rain-layer animate-rain-fall"
              style={
                {
                  animationDuration: `${(l.dur * tune.speed).toFixed(2)}s`,
                  "--rain-gap": `${l.gap}px`,
                  "--rain-span": `${l.span}px`,
                  "--rain-len": `${l.len}px`,
                  "--rain-tilt": `${l.tilt}deg`,
                  "--rain-alpha": (l.alpha * tune.alpha).toFixed(3),
                } as CSSProperties
              }
            />
          ))
        : null}

      {/* ---- Kabut (statis) ---- */}
      {kind === "fog"
        ? FOG_BANDS.map((f, i) => (
            <div
              key={`fog-${i}`}
              className="weather-fog-band"
              style={
                {
                  top: f.top,
                  height: f.height,
                  "--fog-alpha": f.alpha,
                } as CSSProperties
              }
            />
          ))
        : null}
    </div>
  );
}

export { WeatherScene };
export type { WeatherSceneProps };

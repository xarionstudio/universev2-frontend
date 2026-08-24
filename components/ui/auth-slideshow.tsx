"use client";

import * as React from "react";

import { assetUrl, type settingsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Slideshow foto panel kiri halaman login/register — crossfade otomatis tiap
   5 detik, dengan dot navigasi di bawah. Daftar slide diatur superadmin lewat
   Settings → Halaman Auth (lihat lib/auth-page-config.ts untuk fallback-nya).

   `children` dirender di atas foto tapi di bawah dots — tempat vignette/
   gradient dekoratif milik masing-masing halaman, supaya dots tidak ikut
   tertutup gelap.

   Memakai <img> biasa, bukan next/image: sumber gambar bisa dari /uploads
   backend (di luar kendali optimizer) dan foto ini murni dekoratif full-bleed. */

type Slide = settingsApi.ApiAuthSlide;

const SLIDE_INTERVAL_MS = 5000;

/* Hasil upload backend ("/uploads/…") di-resolve lewat assetUrl karena BASE
   API bisa menunjuk origin lain; aset public frontend ("/login-bg.avif")
   dibiarkan relatif ke origin halaman. Diekspor untuk thumbnail di
   Settings → Halaman Auth. */
export function authSlideSrc(s: Pick<Slide, "imageUrl">): string {
  return s.imageUrl.startsWith("/uploads/")
    ? (assetUrl(s.imageUrl) ?? s.imageUrl)
    : s.imageUrl;
}

export function AuthSlideshow({
  slides,
  children,
  className,
}: {
  slides: Slide[];
  children?: React.ReactNode;
  className?: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const active = slides.length ? idx % slides.length : 0;

  /* Daftar slide bisa berganti (fallback → data server) — mulai lagi dari
     awal supaya urutannya tetap sesuai aturan superadmin. Pola "adjust state
     during render" dari dokumen React, bukan effect, agar tidak ada frame
     dengan indeks basi. */
  const [prevSlides, setPrevSlides] = React.useState(slides);
  if (prevSlides !== slides) {
    setPrevSlides(slides);
    setIdx(0);
  }

  /* `active` di dependency: klik dot ikut me-reset penghitung 5 detiknya. */
  React.useEffect(() => {
    if (slides.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      SLIDE_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [slides, active]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {slides.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${s.id}-${s.imageUrl}`}
          src={authSlideSrc(s)}
          alt=""
          aria-hidden
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-cover object-center transition-opacity duration-1000 ease-in-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
        />
      ))}

      {children}

      {slides.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={`dot-${s.id}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={s.title || `Slide ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "h-2 cursor-pointer rounded-full transition-[background-color,width] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                i === active
                  ? "w-5 bg-primary"
                  : "w-2 bg-[rgba(255,255,255,.45)] hover:bg-[rgba(255,255,255,.75)]"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

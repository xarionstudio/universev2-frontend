"use client";

/* Konfigurasi tampilan halaman login/register — slide foto panel kiri dan
   opsi Posisi/Departemen — diambil dari backend (GET /api/auth/page-config,
   publik) dan diatur superadmin lewat Settings → Halaman Auth.

   Konsumen: form Register, Pending Registrasi, dan Tambah/Edit Karyawan
   (dropdown Departemen & Posisi). Semua memakai daftar aktif yang sama.

   Halaman auth harus tetap tampil utuh saat backend belum hidup, jadi hook
   ini selalu mulai dari FALLBACK lalu menimpanya dengan data server bila
   fetch berhasil. Daftar kosong dari server juga jatuh ke fallback — lebih
   baik menampilkan opsi lama daripada dropdown kosong yang memblokir
   registrasi. */
import * as React from "react";

import { authApi } from "@/lib/api";

export type AuthPageConfig = authApi.AuthPageConfig;

export const AUTH_PAGE_FALLBACK: AuthPageConfig = {
  /* id ≤ 0 menandai slide fallback lokal, bukan baris DB. */
  slides: [
    {
      id: 0,
      title: "",
      imageUrl: "/login-bg.avif",
      sortOrder: 0,
      active: true,
    },
    {
      id: -1,
      title: "",
      imageUrl: "/register-bg.avif",
      sortOrder: 1,
      active: true,
    },
    {
      id: -2,
      title: "",
      imageUrl: "/unit-16.avif",
      sortOrder: 2,
      active: true,
    },
  ],
  /* KAPITAL — selaras aturan penulisan & data pasca-migrasi 000021 */
  positions: [
    "OPERATOR DUMP TRUCK",
    "OPERATOR DIGGER",
    "FOREMAN",
    "SUPERVISOR",
    "ADMIN ROSTER",
  ],
  departments: ["OPERATION", "PLANT", "SDI", "HRGA", "SHE"],
};

export function useAuthPageConfig(): AuthPageConfig {
  const [config, setConfig] =
    React.useState<AuthPageConfig>(AUTH_PAGE_FALLBACK);

  React.useEffect(() => {
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      authApi
        .getPageConfig(c.signal)
        .then((cfg) => {
          setConfig({
            slides: cfg.slides?.length ? cfg.slides : AUTH_PAGE_FALLBACK.slides,
            positions: cfg.positions?.length
              ? cfg.positions
              : AUTH_PAGE_FALLBACK.positions,
            departments: cfg.departments?.length
              ? cfg.departments
              : AUTH_PAGE_FALLBACK.departments,
          });
        })
        .catch(() => {
          /* backend tak terjangkau — fallback sudah terpasang */
        });
    };
    load();
    /* Muat ulang saat jendela kembali fokus: superadmin yang baru menambah
       Posisi/Departemen di Settings → Halaman Auth (tab/perangkat lain)
       langsung terlihat oleh calon pendaftar yang halamannya SUDAH terbuka —
       tanpa ini opsinya baru muncul setelah reload manual. */
    window.addEventListener("focus", load);
    return () => {
      ac?.abort();
      window.removeEventListener("focus", load);
    };
  }, []);

  return config;
}

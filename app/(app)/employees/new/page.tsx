import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Tambah Karyawan",
  description: "Tambah karyawan baru — field bertanda * wajib diisi.",
};

export default function Page() {
  return <PageClient />;
}

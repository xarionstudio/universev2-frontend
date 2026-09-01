import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Import Data Karyawan",
  description:
    "Impor Excel data karyawan beserta kompetensi alat beratnya — diperiksa dulu, disimpan setelah disetujui.",
};

export default function Page() {
  return <PageClient />;
}

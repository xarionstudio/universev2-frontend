import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Upload Roster",
  description:
    "Impor roster bulanan dari file Excel — satu baris per karyawan per hari.",
};

export default function Page() {
  return <PageClient />;
}

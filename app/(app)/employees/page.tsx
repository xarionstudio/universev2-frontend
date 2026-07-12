import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Data Karyawan",
  description:
    "Master data karyawan — kepegawaian, kompetensi SIMPER, medis, dan mess.",
};

export default function Page() {
  return <PageClient />;
}

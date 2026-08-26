import type { Metadata } from "next";

import PageClient from "./page-client";

type Props = { params: Promise<{ nik: string }> };

/* Judul memakai NIK, bukan nama: datanya kini milik backend dan diambil dari
   klien (ADR 0014), sehingga nama belum tersedia saat metadata dirakit. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nik } = await params;
  return {
    title: `Detail Karyawan — NIK ${nik}`,
    description: "Detail karyawan — kepegawaian, SIMPER, medis, dan mess.",
  };
}

export default function Page(props: Props) {
  return <PageClient {...props} />;
}

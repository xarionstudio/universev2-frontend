import type { Metadata } from "next";

import PageClient from "./page-client";

type Props = { params: Promise<{ nik: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nik } = await params;
  return {
    title: `Edit Karyawan — ${nik}`,
    description:
      "Perbarui data kepegawaian, kompetensi SIMPER, medis, dan mess karyawan.",
  };
}

export default function Page(props: Props) {
  return <PageClient {...props} />;
}

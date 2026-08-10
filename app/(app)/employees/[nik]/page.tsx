import type { Metadata } from "next";

import PageClient from "./page-client";

type Props = { params: Promise<{ nik: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nik } = await params;
  return {
    title: `Detail Karyawan — ${nik}`,
    description: "Detail karyawan — kepegawaian, SIMPER, medis, dan mess.",
  };
}

export default function Page(props: Props) {
  return <PageClient {...props} />;
}

import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Entri Revisi Baru",
  description:
    "Ajukan koreksi absensi — setiap entri butuh approval berjenjang.",
};

export default function Page() {
  return <PageClient />;
}

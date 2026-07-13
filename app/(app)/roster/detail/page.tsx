import { Suspense } from "react";
import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Detail Roster",
  description: "Isi lengkap file roster — hanya-baca.",
};

export default function Page() {
  return (
    <Suspense>
      <PageClient />
    </Suspense>
  );
}

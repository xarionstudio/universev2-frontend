import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Revisi Roster",
  description:
    "Daftar pengajuan revisi absensi dan statusnya — keputusan diambil di Approval Revisi.",
};

export default function Page() {
  return <PageClient />;
}

import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Approval Revisi Absensi",
  description: "Setiap keputusan tercatat dengan nama approver dan waktu.",
};

export default function Page() {
  return <PageClient />;
}

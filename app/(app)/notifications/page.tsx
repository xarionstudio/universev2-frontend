import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Notifikasi",
  description: "Semua pemberitahuan sistem UNIVERSE.",
};

export default function Page() {
  return <PageClient />;
}

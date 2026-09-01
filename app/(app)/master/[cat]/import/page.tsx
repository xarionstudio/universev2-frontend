import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Import Master Data",
  description:
    "Impor Excel master Eq. Class dan Type EGI — diperiksa dulu, disimpan setelah disetujui.",
};

export default function Page() {
  return <PageClient />;
}

import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Display Fit To Work",
  description:
    "Layar TV kelayakan kerja operator — kurang tidur dan belum lapor di urutan teratas.",
};

export default function Page() {
  return <PageClient />;
}

import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Setting Fleet",
  description:
    "Formasi fleet — 1 digger (leader) + unit OHT + lokasi kerja + bus default.",
};

export default function Page() {
  return <PageClient />;
}

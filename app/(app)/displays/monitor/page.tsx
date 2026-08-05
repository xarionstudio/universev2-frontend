import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Pengelolaan Display Monitor",
  description:
    "TV multi-fleet — atur fleet yang tayang, urutan giliran, dan durasi per giliran.",
};

export default function Page() {
  return <PageClient />;
}

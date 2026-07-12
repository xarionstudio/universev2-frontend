import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Fleet Allocation",
  description:
    "Alokasi unit ke operator per shift — status fit-to-work ditarik langsung dari log tidur.",
};

export default function Page() {
  return <PageClient />;
}

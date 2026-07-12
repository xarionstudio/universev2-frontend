import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Monitoring Fingerprint",
  description:
    "Layar TV status mesin fingerprint — mesin offline menonjol di urutan teratas.",
};

export default function Page() {
  return <PageClient />;
}

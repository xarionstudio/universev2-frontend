import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Mesin Fingerprint",
  description:
    "Pendaftaran mesin fingerprint — alamat IP, port, dan uji koneksi; sumber data layar Monitoring Fingerprint.",
};

export default function Page() {
  return <PageClient />;
}

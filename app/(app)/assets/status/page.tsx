import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Status Unit",
  description: "Status operasional unit — ubah status dengan alasan; riwayat di panel samping.",
}

export default function Page() {
  return <PageClient />
}

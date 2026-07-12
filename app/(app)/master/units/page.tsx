import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Database Unit",
  description: "Master data unit kendaraan — sumber tipe & spesifikasi untuk status dan alokasi.",
}

export default function Page() {
  return <PageClient />
}

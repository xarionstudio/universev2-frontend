import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Riwayat Fit To Work",
  description: "Semua operator — seluruh riwayat log tidur.",
}

export default function Page() {
  return <PageClient />
}

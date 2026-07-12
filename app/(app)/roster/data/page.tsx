import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Data Roster",
  description: "Daftar roster yang sudah diunggah, dikelompokkan per bulan.",
}

export default function Page() {
  return <PageClient />
}

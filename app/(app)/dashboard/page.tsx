import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Ringkasan operasional pagi ini — unfit, belum absen, unit breakdown, dan pending approval.",
}

export default function Page() {
  return <PageClient />
}

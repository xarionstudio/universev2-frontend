import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Fit To Work",
  description: "Kelayakan kerja operator berdasarkan log tidur — ambang fit: ≥ 6 jam.",
}

export default function Page() {
  return <PageClient />
}

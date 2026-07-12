import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Display Fleet",
  description: "Layar TV status unit real-time — breakdown selalu menonjol di urutan teratas.",
}

export default function Page() {
  return <PageClient />
}

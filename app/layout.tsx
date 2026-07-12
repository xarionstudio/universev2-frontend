import type { Metadata } from "next"
import { Instrument_Sans, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers/providers"

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "UNIVERSE",
  description: "Unggul Network for Integrated Vehicle Resource Smart Ecosystem",
}

// Resolver tema (System|Terang|Gelap) — dijalankan sebelum paint agar tidak flash
const themeInit = `(function(){try{var p=localStorage.getItem('universe-theme')||'system';var l=window.matchMedia('(prefers-color-scheme: light)').matches;document.documentElement.setAttribute('data-theme',p==='system'?(l?'light':'dark'):p);}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";

import "./globals.css";

import { Providers } from "@/components/providers/providers";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "UNIVERSE — Fleet Automation",
    template: "%s · UNIVERSE",
  },
  description: "Unggul Network for Integrated Vehicle Resource Smart Ecosystem",
  applicationName: "UNIVERSE",
  // aplikasi internal — jangan diindeks mesin pencari
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAF3FF" },
    { media: "(prefers-color-scheme: dark)", color: "#010416" },
  ],
};

/* Resolver tema (System|Terang|Gelap) — dijalankan sebelum paint agar tidak
   flash. "System" berarti otomatis: ikut cuaca. Cuaca belum bisa diketahui
   sedini ini, jadi dipakai hasil terakhir yang disimpan ThemeProvider; kalau
   belum pernah ada, jatuh ke preferensi OS. */
const themeInit = `(function(){try{var p=localStorage.getItem('universe-theme')||'system';var l=window.matchMedia('(prefers-color-scheme: light)').matches;var s=l?'light':'dark';var t=(p==='light'||p==='dark')?p:(localStorage.getItem('universe-theme-wx')||s);document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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
  );
}

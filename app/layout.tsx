import "./globals.css"
import "./screenshot-protection.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import { Providers } from "@/components/providers"
import Footer from "@/components/footer"
import { ScreenshotProtection } from "@/components/screenshot-protection"
import { FullWidthLayout } from "@/components/full-width-layout"

const inter = Inter({ subsets: ["latin"], display: "swap" })

const metadataBase =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : new URL("https://ultimaratio.app")

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "fragenkreuzen.de – Die Fragenbank für dein Medizinstudium",
    template: "%s · fragenkreuzen.de",
  },
  description:
    "Die Fragenbank für dein Medizinstudium — Übe IMPP-Fragen (2. Staatsexamen) im Prüfungs- oder Übungsmodus mit Fallvignetten, Bildern, Laborwerten, Auswertung und Spaced Repetition.",
  icons: {
    icon: [
      { url: "/logo/fragenkreuzen logo transparent.png", sizes: "any" },
      { url: "/logo/fragenkreuzen logo transparent.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/fragenkreuzen logo transparent.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/logo/fragenkreuzen logo transparent.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: metadataBase,
    title: "fragenkreuzen.de – Die Fragenbank für dein Medizinstudium",
    description:
      "Die Fragenbank für dein Medizinstudium — Trainiere Einzelfragen & Fallvignetten mit Auswertung, Timer und Spaced Repetition.",
    siteName: "fragenkreuzen.de",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "fragenkreuzen.de – Die Fragenbank für dein Medizinstudium" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "fragenkreuzen.de – Die Fragenbank für dein Medizinstudium",
    description:
      "Die Fragenbank für dein Medizinstudium — Trainiere Einzelfragen & Fallvignetten mit Auswertung, Timer und Spaced Repetition.",
    images: ["/og.jpg"],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
}

const themeInitScript = `
(function(){
  try {
    var m = localStorage.getItem('theme');
    if (m === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (m === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Kein gespeichertes Theme - verwende System-Präferenz
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  } catch (e) {
    // Fallback: Light Mode
    document.documentElement.classList.remove('dark');
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ScreenshotProtection>
            <div className="min-h-dvh flex flex-col">
              {/* Header immer zentriert mit identischem L/R-Padding */}
              <header className="w-full">
                <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
                  <SiteHeader />
                </div>
              </header>

              {/* Main-Content zentriert, gleiches Padding links/rechts */}
              <main className="flex-1 w-full">
                <FullWidthLayout>
                  {children}
                </FullWidthLayout>
              </main>

              {/* Footer */}
              <Footer />
            </div>
          </ScreenshotProtection>
        </Providers>
      </body>
    </html>
  )
}
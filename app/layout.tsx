import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"], display: "swap" })

const metadataBase =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : new URL("https://ultimaratio.app")

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "UltimaRatio – IMPP Coach",
    template: "%s · UltimaRatio",
  },
  description:
    "Übe IMPP-Fragen (2. Staatsexamen) im Prüfungs- oder Übungsmodus — mit Fallvignetten, Bildern, Laborwerten, Auswertung und Spaced Repetition.",
  openGraph: {
    type: "website",
    url: metadataBase,
    title: "UltimaRatio – IMPP Coach fürs 2. Staatsexamen",
    description:
      "Trainiere Einzelfragen & Fallvignetten mit Auswertung, Timer und Spaced Repetition.",
    siteName: "UltimaRatio",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "UltimaRatio – IMPP Coach" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UltimaRatio – IMPP Coach fürs 2. Staatsexamen",
    description:
      "Trainiere Einzelfragen & Fallvignetten mit Auswertung, Timer und Spaced Repetition.",
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
    if (m === 'dark' || (m === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
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
          <div className="min-h-dvh flex flex-col">
            {/* Header immer zentriert mit identischem L/R-Padding */}
            <header className="w-full">
              <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
                <SiteHeader />
              </div>
            </header>

            {/* Main-Content zentriert, gleiches Padding links/rechts */}
            <main className="flex-1 w-full">
              <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>

            {/* Footer zentriert, gleiches Padding links/rechts */}
            <footer className="border-t w-full">
              <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} UltimaRatio
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
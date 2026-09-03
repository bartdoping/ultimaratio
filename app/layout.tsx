import "./globals.css"
import "./screenshot-protection.css"
import type { Metadata, Viewport } from "next"
import { Inter, Fraunces } from "next/font/google"
import { cookies } from "next/headers"
import { Providers } from "@/components/providers"
import { ScreenshotProtection } from "@/components/screenshot-protection"
import { LayoutSwitch } from "@/components/app-shell/layout-switch"
import {
  FONT_SCALE_COOKIE,
  FONT_SCALE_DEFAULT,
  fontScaleHtmlSize,
  isFontScale,
} from "@/lib/font-scale"
import { consentModeBootstrapScript } from "@/lib/consent"

/*
 * Schriften wie auf ultima-rat.io: Inter als Fließtext-/UI-Schrift, Fraunces
 * als Display-Serif für Akzente. Beide werden von Next.js selbst gehostet —
 * es geht keine Anfrage an Google-Server (siehe Datenschutzerklärung § 15).
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK"],
})

/**
 * Basis für kanonische URLs, Open-Graph-Bilder und die Sitemap.
 *
 * Vorher stand hier fest `https://ultimaratio.app` als Rückfall — eine Domain,
 * unter der die Plattform nicht läuft. Ohne gesetztes NEXT_PUBLIC_APP_URL
 * zeigten damit sämtliche OG- und Canonical-Angaben ins Leere.
 *
 * Reihenfolge:
 *  1. NEXT_PUBLIC_APP_URL — ausdrückliche Vorgabe, gewinnt immer.
 *  2. NEXTAUTH_URL — in Production zwingend gesetzt und per Definition der
 *     kanonische Ursprung der Anwendung (Auth-Callbacks laufen darüber).
 *  3. VERCEL_URL — Vorschau-Deployments ohne eigene Domain.
 *  4. Die Live-Domain als letzter Rückfall.
 */
function resolveMetadataBase(): URL {
  const kandidaten = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]
  for (const kandidat of kandidaten) {
    const wert = kandidat?.trim()
    if (!wert) continue
    try {
      return new URL(wert)
    } catch {
      // Unbrauchbarer Wert — nächsten Kandidaten versuchen.
    }
  }
  return new URL("https://fragenkreuzen.de")
}

const metadataBase = resolveMetadataBase()

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
    { media: "(prefers-color-scheme: dark)", color: "#071619" },
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "fragenkreuzen.de",
  url: metadataBase.toString(),
  logo: `${metadataBase.toString().replace(/\/$/, "")}/logo/fragenkreuzen logo transparent.png`,
  description:
    "KI-gestützter Prüfungsfragen-Generator für Medizin- und Zahnmedizinstudierende im DACH-Raum.",
  sameAs: ["https://fragenkreuzen.de"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@ultima-rat.io",
      availableLanguage: ["German"],
    },
  ],
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "fragenkreuzen.de",
  url: metadataBase.toString(),
  inLanguage: "de-DE",
  publisher: { "@type": "Organization", name: "fragenkreuzen.de" },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const rawScale = cookieStore.get(FONT_SCALE_COOKIE)?.value
  const scale = isFontScale(rawScale) ? rawScale : FONT_SCALE_DEFAULT
  const rootFontSize = fontScaleHtmlSize(scale)

  return (
    // suppressHydrationWarning: Das Theme-Init-Script im <head> setzt bewusst
    // class/color-scheme auf <html>, bevor React hydratisiert (Standardmuster
    // von next-themes zur Vermeidung eines Farb-Flashs).
    <html
      lang="de"
      suppressHydrationWarning
      style={{ fontSize: rootFontSize }}
      data-font-scale={scale}
    >
      <head>
        {/*
          Google Consent Mode v2 — MUSS vor jedem Google-Tag laufen.
          Setzt alle einwilligungspflichtigen Signale auf "denied" und wendet
          erst danach eine ggf. gespeicherte Einwilligung an (§ 25 Abs. 1 TDDDG).
        */}
        <script dangerouslySetInnerHTML={{ __html: consentModeBootstrapScript() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        <noscript>
          <div
            style={{
              padding: "12px 16px",
              background: "#fff8d5",
              color: "#5a4a00",
              fontSize: "14px",
              textAlign: "center",
              borderBottom: "1px solid #e6d36a",
            }}
          >
            fragenkreuzen.de benötigt JavaScript für den Generator. Bitte aktiviere JS in deinem Browser
            oder besuche uns mit einem modernen Browser, um zu kreuzen.
          </div>
        </noscript>
        <Providers>
          <ScreenshotProtection>
            <LayoutSwitch>{children}</LayoutSwitch>
          </ScreenshotProtection>
        </Providers>
      </body>
    </html>
  )
}
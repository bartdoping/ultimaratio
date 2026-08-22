import Link from "next/link"
import { CookieSettingsLink } from "@/components/consent/consent-banner"

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
  { href: "/datenschutz", label: "Datenschutzerklärung" },
] as const

const HELP_LINKS = [
  { href: "/faq", label: "Häufige Fragen (FAQ)" },
  { href: "/pricing", label: "Preise" },
  { href: "/blog", label: "Blog" },
] as const

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Rechtliches */}
          <div>
            <h3 className="mb-4 font-semibold">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                {/*
                  Kündigungsschaltfläche nach § 312k BGB: muss ständig verfügbar
                  sowie unmittelbar und leicht zugänglich sein — daher auf jeder
                  Seite im Footer und ohne Anmeldung erreichbar.
                */}
                <Link
                  href="/kuendigung"
                  className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                >
                  Verträge hier kündigen
                </Link>
              </li>
            </ul>
          </div>

          {/* Hilfe */}
          <div>
            <h3 className="mb-4 font-semibold">Hilfe</h3>
            <ul className="space-y-2 text-sm">
              {HELP_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsLink className="text-left text-muted-foreground transition-colors hover:text-foreground" />
              </li>
              <li>
                <a
                  href="mailto:info@ultima-rat.io?subject=Bug%20auf%20fragenkreuzen.de"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Bug melden
                </a>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="mb-4 font-semibold">Kontakt</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR</p>
              <p>Hallesche Straße 94a</p>
              <p>44143 Dortmund</p>
              <p>Deutschland</p>
              <p className="break-all">
                <a
                  href="mailto:info@ultima-rat.io"
                  className="transition-colors hover:text-foreground"
                >
                  info@ultima-rat.io
                </a>
              </p>
            </div>
          </div>

          {/* Über */}
          <div>
            <h3 className="mb-4 font-semibold">fragenkreuzen.de</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Medizinische Prüfungsvorbereitung</p>
              <p>KI-Generator für Examensfragen</p>
              <p className="pt-4 text-xs leading-relaxed">
                © {new Date().getFullYear()} Thavarajasingam, Ahkash; Eid, Mustafa
                Magdy Abdel Razik Mahmoud GbR
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
          <p className="flex flex-col flex-wrap items-center justify-center gap-1 sm:flex-row sm:gap-2">
            <span>Alle Rechte vorbehalten.</span>
            <span className="hidden sm:inline">|</span>
            <Link href="/impressum" className="transition-colors hover:text-foreground">
              Impressum
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link href="/datenschutz" className="transition-colors hover:text-foreground">
              Datenschutz
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link
              href="/kuendigung"
              className="transition-colors hover:text-foreground"
            >
              Verträge hier kündigen
            </Link>
          </p>
          <p className="mt-2 text-xs">
            Preisangabe Pro: 9,99 € pro Monat. Endpreis – gemäß § 19 UStG erheben wir
            als Kleinunternehmer keine Umsatzsteuer und weisen daher keine aus.
          </p>
        </div>
      </div>
    </footer>
  )
}

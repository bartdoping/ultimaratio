import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/impressum" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link 
                  href="/datenschutz" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link 
                  href="/agb" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  AGB
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="font-semibold mb-4">Kontakt</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>UltimaRatio GbR</p>
              <p className="break-all">info@ultima-rat.io</p>
              <p className="break-all">https://fragenkreuzen.de</p>
            </div>
          </div>

          {/* Copyright */}
          <div>
            <h3 className="font-semibold mb-4">fragenkreuzen.de</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Medizinische Prüfungsvorbereitung</p>
              <p>Fragenkreuzen für das Staatsexamen</p>
              <p className="pt-4 text-xs leading-relaxed">
                © {new Date().getFullYear()} Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <span>Alle Rechte vorbehalten.</span>
            <span className="hidden sm:inline">|</span>
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              Datenschutz
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

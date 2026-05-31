import Link from "next/link"

type LegalShellProps = {
  title: string
  description?: string
  lastUpdated?: string
  children: React.ReactNode
}

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
  { href: "/datenschutz", label: "Datenschutzerklärung" },
] as const

export function LegalShell({
  title,
  description,
  lastUpdated,
  children,
}: LegalShellProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="space-y-2 border-b pb-6">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rechtliches
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">Stand: {lastUpdated}</p>
        )}
      </header>

      {/* Sekundär-Nav: andere Rechtstexte */}
      <nav
        aria-label="Rechtstexte"
        className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        <ul className="flex w-max gap-1.5 sm:flex-wrap">
          {LEGAL_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex h-8 items-center whitespace-nowrap rounded-full border bg-card/60 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="legal-content mt-6 space-y-6 text-sm leading-relaxed text-foreground sm:text-[15px]">
        {children}
      </article>
    </div>
  )
}

/**
 * Wiederverwendbare Section-Komponente für eine konsistente Optik.
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

export function LegalSubsection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

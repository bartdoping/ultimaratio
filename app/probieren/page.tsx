import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { GeneratorPageClient } from "@/components/generator/generator-page-client"
import {
  getGeneratorQuota,
  createVisitorId,
  hashClientIp,
  verifyVisitorCookie,
  GENERATOR_VISITOR_COOKIE,
  GENERATOR_FREE_DAILY_LIMIT,
} from "@/lib/generator-limits"
import { Sparkles, MousePointerClick, Brain } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Generator gratis testen — kein Konto nötig | fragenkreuzen.de",
  description: `Generiere ${GENERATOR_FREE_DAILY_LIMIT} medizinische Prüfungsfragen pro Tag mit KI – ohne Registrierung, ohne Kreditkarte. Sofort kreuzen.`,
  openGraph: {
    title: "Generator gratis testen | fragenkreuzen.de",
    description: `${GENERATOR_FREE_DAILY_LIMIT} KI-generierte Prüfungsfragen am Tag – ohne Konto. Sofort loslegen.`,
    type: "website",
  },
}

async function loadAnonQuota() {
  const session = await getServerSession(authOptions)

  // Eingeloggte User: direkt in den vollen Generator.
  if (session?.user) {
    redirect("/generator")
  }

  const jar = await cookies()
  const signedCookie = jar.get(GENERATOR_VISITOR_COOKIE)?.value
  const anonKey = verifyVisitorCookie(signedCookie) ?? createVisitorId()

  const hdrs = await headers()
  const ipHash = hashClientIp(
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip")
  )

  const quota = await getGeneratorQuota({
    anonKey,
    ipHash,
    isPro: false,
    isAdmin: false,
  })

  return {
    isLoggedIn: false,
    isPro: false,
    quota,
  }
}

export default async function ProbierenPage() {
  const initial = await loadAnonQuota()

  return (
    <main className="py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Demo-Banner */}
        <div className="mb-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card shadow-sm sm:mb-8">
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr,auto] sm:items-center sm:px-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Kostenlose Demo · ohne Konto
              </div>
              <h1 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                Teste den KI-Generator – {GENERATOR_FREE_DAILY_LIMIT}&nbsp;Fragen gratis
              </h1>
              <p className="text-sm text-muted-foreground">
                Keine Registrierung, keine Karte. Du bekommst exakt das, was Pro-User
                nutzen — nur mit Tageslimit.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:gap-1.5">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Konto kostenlos anlegen
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Schon Konto? Login
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            <Feature
              icon={Brain}
              title="Volle Qualität"
              text="Gleiche KI, gleiche Erklärungstiefe wie für Pro-User."
            />
            <Feature
              icon={MousePointerClick}
              title="Sofort kreuzbar"
              text="Antworten direkt in der Demo, Erklärung inline."
            />
            <Feature
              icon={Sparkles}
              title="Pro = 100/Tag"
              text="3 → 100 Generierungen pro Tag, ab 9,99 €/Monat."
            />
          </div>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-sm text-muted-foreground">
              Lade Demo-Generator…
            </div>
          }
        >
          <GeneratorPageClient
            initialIsLoggedIn={initial.isLoggedIn}
            initialIsPro={initial.isPro}
            initialQuota={initial.quota}
            initialTrialEligible={false}
            initialTrialEndsAt={null}
          />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Hinweis: Das Demo-Limit gilt pro Browser & IP. Für 100&nbsp;Generierungen pro Tag
          und die volle Pro-Erfahrung registriere dich kostenlos und starte deine
          7-Tage-Pro-Testphase.
        </p>
      </div>
    </main>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{text}</p>
        </div>
      </div>
    </div>
  )
}

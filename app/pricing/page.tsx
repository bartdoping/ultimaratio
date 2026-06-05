import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Check, X, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrialStartButton } from "@/components/subscription/trial-start-button"
import {
  GENERATOR_FREE_DAILY_LIMIT,
  GENERATOR_PRO_DAILY_LIMIT,
} from "@/lib/generator-plan-config"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Preise – Pro für 9,99 €/Monat | fragenkreuzen.de",
  description:
    "Free vs. Pro im Vergleich – 100 Generierungen pro Tag für 9,99 €/Monat, monatlich kündbar. Inklusive 7-Tage-Pro-Testphase ohne Karte. Inhaltlich vergleichbar mit Amboss & Thieme via medici, zu einem Bruchteil des Preises.",
  openGraph: {
    title: "fragenkreuzen.de – Preise & Pro-Vergleich",
    description:
      "Pro für 9,99 €/Monat mit 7-Tage-Testphase. Free bleibt kostenlos.",
    type: "website",
  },
}

const FEATURES: Array<{ label: string; free: string | boolean; pro: string | boolean; highlight?: boolean }> = [
  {
    label: "Generierungen pro Tag",
    free: `${GENERATOR_FREE_DAILY_LIMIT}`,
    pro: `${GENERATOR_PRO_DAILY_LIMIT}`,
    highlight: true,
  },
  { label: "Single-Choice (A–E) mit Einzelerklärungen pro Option", free: true, pro: true },
  { label: "Fallvignetten mit 2–5 Teilfragen", free: true, pro: true },
  { label: "Schwierigkeitsstufen 1–5", free: true, pro: true },
  { label: "Must-Know & Lernhilfe je Frage (sofern wirklich hilfreich)", free: true, pro: true },
  { label: "Eingebaute Laborwert-Referenz", free: true, pro: true },
  { label: "Text-Highlighting & Antworten durchstreichen", free: true, pro: true },
  { label: "Lange Fallvignetten alltagstauglich", free: "Theoretisch", pro: "Alltagstauglich" },
  { label: "Schwierigkeit 4 & 5 als Daily-Driver", free: "Schwierig wegen Limit", pro: "Voll nutzbar" },
  { label: "Tiefere Erklärungen ohne Spar-Druck", free: "Begrenzt durch Limit", pro: "Ohne Limit-Druck" },
  { label: "Werbefrei", free: true, pro: true },
  { label: "Tracking-arm (kein Cross-Site-Tracking)", free: true, pro: true },
  { label: "DSGVO, deutsche AGB, deutsches Hosting-Setup", free: true, pro: true },
]

const COMPETITORS: Array<{
  name: string
  priceLabel: string
  perMonth: number | string
  notes: string
}> = [
  { name: "fragenkreuzen.de Pro", priceLabel: "9,99 €/Monat", perMonth: 9.99, notes: "Generator-First, monatlich kündbar, 7 Tage gratis testen." },
  { name: "Amboss (Student)", priceLabel: "≈ 30–35 €/Monat", perMonth: 32.5, notes: "Umfangreich, aber deutlich höhere Investition pro Monat." },
  { name: "Thieme via medici", priceLabel: "≈ 25–30 €/Monat", perMonth: 27.5, notes: "Etabliert, eher Kreuzen aus Bestand statt KI-Generierung." },
  { name: "Examen Online", priceLabel: "≈ 20–25 €/Monat", perMonth: 22.5, notes: "Kreuzen mit Altbeständen – ohne KI-Generator." },
]

export default async function PricingPage() {
  const session = await getServerSession(authOptions)
  let isLoggedIn = false
  let isPro = false
  let trialEligible = false
  let trialEndsAt: string | null = null
  if (session?.user?.email) {
    isLoggedIn = true
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: {
        id: true,
        role: true,
        proTrialStartedAt: true,
        proTrialEndsAt: true,
        subscriptionStatus: true,
      },
    })
    if (user) {
      const isAdmin = user.role === "admin"
      isPro = isAdmin || user.subscriptionStatus === "pro"
      const trialActive = user.proTrialEndsAt
        ? new Date(user.proTrialEndsAt).getTime() > Date.now()
        : false
      trialEligible = !isAdmin && !isPro && !user.proTrialStartedAt
      if (trialActive) {
        trialEndsAt = user.proTrialEndsAt?.toISOString() ?? null
        isPro = true
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Preise
        </span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Pro für 9,99 €/Monat – fair und ehrlich.
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Vergleichbarer Lernumfang wie etablierte Plattformen – zum Bruchteil des Preises.
          {trialEligible && " Starte deine 7-Tage-Pro-Testphase ohne Kreditkarte."}
        </p>
      </div>

      {/* Plan-Karten */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <PlanCard
          title="Free"
          price="0 €"
          subtitle="Für alle, immer kostenlos."
          ctaHref={isLoggedIn ? "/generator" : "/register"}
          ctaLabel={isLoggedIn ? "Zum Generator" : "Kostenlos registrieren"}
          bullets={[
            `${GENERATOR_FREE_DAILY_LIMIT} KI-Generierungen pro Tag`,
            "Volle Erklärungsqualität",
            "Fallvignetten 2–5 Teilfragen",
            "Schwierigkeit 1–5",
          ]}
        />
        <PlanCard
          title="Pro"
          price="9,99 €"
          priceSuffix="/Monat"
          subtitle="Monatlich kündbar, kein Setup."
          highlighted
          ctaHref="/subscription"
          ctaLabel={isPro ? "Abo verwalten" : "Auf Pro upgraden"}
          extraCta={
            trialEligible ? (
              <TrialStartButton size="sm" variant="outline" className="mt-2" />
            ) : null
          }
          bullets={[
            `${GENERATOR_PRO_DAILY_LIMIT} KI-Generierungen pro Tag`,
            "Lange Fallvignetten ohne Limit-Druck",
            "Schwierigkeit 4 & 5 als Daily-Driver",
            "Volle Pro-Erfahrung der KI",
          ]}
        />
      </div>

      {trialEndsAt && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium">Pro-Testphase aktiv</span>{" "}
          <span className="text-muted-foreground">
            – läuft bis {new Date(trialEndsAt).toLocaleDateString("de-DE")}.
          </span>
        </div>
      )}

      {/* Vergleichstabelle */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Detaillierter Vergleich</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle KI-Features stehen auch im Free-Tarif zur Verfügung – Pro hebt das Tageslimit auf das Niveau realer Lern-Sessions.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Feature</th>
                <th className="px-4 py-3 text-left font-medium">Free</th>
                <th className="px-4 py-3 text-left font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row) => (
                <tr
                  key={row.label}
                  className={
                    row.highlight
                      ? "border-t bg-primary/5"
                      : "border-t"
                  }
                >
                  <td className="px-4 py-3 align-top text-foreground">{row.label}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-4 py-3 align-top text-foreground">
                    <Cell value={row.pro} pro />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Wettbewerb */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Wo wir im Markt stehen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wir konkurrieren nicht mit Lehrbüchern – wir machen Kreuzen bezahlbar.
          Die Preise der genannten Anbieter sind Richtwerte (Stand 2026) und
          variieren je nach Vertragslaufzeit und Aktionen.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Plattform</th>
                <th className="px-4 py-3 text-left font-medium">Preis</th>
                <th className="px-4 py-3 text-left font-medium">Einordnung</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr
                  key={c.name}
                  className={
                    i === 0
                      ? "border-t bg-primary/5 font-medium"
                      : "border-t"
                  }
                >
                  <td className="px-4 py-3 align-top">{c.name}</td>
                  <td className="px-4 py-3 align-top tabular-nums">{c.priceLabel}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Preisangaben Dritter sind Schätzwerte zur Orientierung; verbindlich ist immer der Anbieter selbst.
        </p>
      </section>

      {/* Garantie */}
      <section className="mt-10 grid gap-3 rounded-2xl border bg-card/60 p-5 sm:grid-cols-2 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">14-Tage-Geld-zurück-Versprechen</p>
            <p className="text-sm text-muted-foreground">
              Du hast das gesetzliche Widerrufsrecht (siehe{" "}
              <Link href="/widerruf" className="underline underline-offset-2">
                Widerrufsbelehrung
              </Link>
              ). Ein Widerruf binnen 14 Tagen ab Vertragsschluss erstattet dir den vollen Beitrag.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Monatlich kündbar</p>
            <p className="text-sm text-muted-foreground">
              Über den Kündigungsbutton im Account (§&nbsp;312k BGB) – kein Anruf, kein Formular. Pro läuft bis zum Periodenende weiter.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {trialEligible ? (
          <TrialStartButton size="lg" />
        ) : (
          <Button asChild size="lg">
            <Link href={isPro ? "/generator" : "/subscription"}>
              {isPro ? "Zum Generator" : "Pro freischalten"}
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          <Link href="/probieren">Erst kostenlos testen</Link>
        </Button>
      </div>
    </main>
  )
}

function PlanCard({
  title,
  price,
  priceSuffix,
  subtitle,
  bullets,
  ctaHref,
  ctaLabel,
  highlighted,
  extraCta,
}: {
  title: string
  price: string
  priceSuffix?: string
  subtitle: string
  bullets: string[]
  ctaHref: string
  ctaLabel: string
  highlighted?: boolean
  extraCta?: React.ReactNode
}) {
  return (
    <div
      className={
        "flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-colors " +
        (highlighted ? "border-primary/40 ring-1 ring-primary/20" : "")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {highlighted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Empfohlen
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums">{price}</span>
        {priceSuffix && <span className="text-sm text-muted-foreground">{priceSuffix}</span>}
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex-1" />
      <div className="flex flex-col gap-2">
        <Button asChild className="w-full" variant={highlighted ? "default" : "outline"}>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        {extraCta}
      </div>
    </div>
  )
}

function Cell({ value, pro }: { value: string | boolean; pro?: boolean }) {
  if (value === true) {
    return (
      <span
        className={
          "inline-flex h-6 w-6 items-center justify-center rounded-full " +
          (pro ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")
        }
        aria-label="enthalten"
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-label="nicht enthalten"
      >
        <X className="h-3.5 w-3.5" />
      </span>
    )
  }
  return <span>{value}</span>
}

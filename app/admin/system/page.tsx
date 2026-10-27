import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { GENERATOR_MODEL } from "@/lib/generator-ai-config"
import { costUsd, modelPrices } from "@/lib/ai-usage"
import { getStripeConfig } from "@/lib/stripe-config"
import { diagnosePlans } from "@/lib/stripe-plans"
import { pushConfigured } from "@/lib/push"
import { globalRefillCap } from "@/lib/pool-refill"

export const dynamic = "force-dynamic"

/**
 * Systemstatus: alles, was den Betrieb gefährden kann, auf einer Seite —
 * mit Ampel. Gedacht für den täglichen Blick und für den Ernstfall
 * ("Warum kommen keine Fragen?").
 *
 * Gibt nie Geheimnisse aus, nur "gesetzt / fehlt".
 */

type Ampel = "ok" | "warn" | "fehler"
type Zeile = { titel: string; wert: string; ampel: Ampel; hinweis?: string }

const STUNDE = 3_600_000
const gesetzt = (n: string) => !!process.env[n]?.trim()

function farbe(a: Ampel) {
  return a === "ok" ? "bg-emerald-500" : a === "warn" ? "bg-amber-500" : "bg-red-500"
}

function vor(d: Date | null | undefined): string {
  if (!d) return "nie"
  const min = Math.round((Date.now() - d.getTime()) / 60_000)
  if (min < 60) return `vor ${min} min`
  const h = Math.round(min / 60)
  return h < 48 ? `vor ${h} h` : `vor ${Math.round(h / 24)} Tagen`
}

export default async function SystemPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/")

  const jetzt = new Date()
  const seit24 = new Date(jetzt.getTime() - 24 * STUNDE)

  // --- Datenbank-Latenz ---
  const t0 = Date.now()
  let dbOk = true
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbOk = false
  }
  const dbMs = Date.now() - t0

  // Eine kaputte Abfrage darf nicht die ganze Seite reißen — gerade im
  // Ernstfall muss der Rest sichtbar bleiben. Fehler landen als rote Zeile.
  const abfrageFehler: string[] = []
  const sicher = <T,>(titel: string, p: Promise<T>, ersatz: T): Promise<T> =>
    p.catch((e: unknown) => {
      const msg = e instanceof Error ? e.message.split("\n").filter(Boolean).pop() ?? e.message : String(e)
      abfrageFehler.push(`${titel}: ${msg.slice(0, 160)}`)
      console.error(`[admin/system] ${titel}:`, e)
      return ersatz
    })
  const zaehle = (name: string) => sicher(name, prisma.productEvent.count({ where: { name, createdAt: { gte: seit24 } } }), 0)

  const [
    signups,
    beantwortet,
    genFehlgeschlagen,
    mailFehler,
    erinnerungen,
    aboStart,
    aboEnde,
    kreuzGen,
    kiGesamt,
    kiFehler,
    kiFehlerNachZweck,
    kiVerbrauch,
    letzteWebhooks,
    haengendeWebhooks,
    cronLaeufe,
    aboAktiv,
    paesseAktiv,
    testphasenAktiv,
    poolAktiv,
    poolGemeldet,
    feedback24,
  ] = await Promise.all([
    zaehle("signup"),
    zaehle("question_answered"),
    zaehle("generation_failed"),
    zaehle("mail_failed"),
    zaehle("reminder_sent"),
    zaehle("subscription_started"),
    zaehle("subscription_canceled"),
    sicher(
      "Neuerzeugung",
      prisma.productEvent.count({
        where: { name: "generation_requested", createdAt: { gte: seit24 }, props: { path: ["via"], equals: "kreuzen" } },
      }),
      0
    ),
    sicher("KI-Aufrufe", prisma.aiUsageEvent.count({ where: { createdAt: { gte: seit24 } } }), 0),
    sicher("KI-Fehler", prisma.aiUsageEvent.count({ where: { createdAt: { gte: seit24 }, ok: false } }), 0),
    sicher(
      "KI-Fehler nach Zweck",
      prisma.aiUsageEvent.groupBy({ by: ["purpose"], where: { createdAt: { gte: seit24 }, ok: false }, _count: { _all: true } }),
      []
    ),
    sicher(
      "KI-Verbrauch",
      prisma.aiUsageEvent.groupBy({
        by: ["model"],
        where: { createdAt: { gte: seit24 } },
        _sum: { inputTokens: true, cachedTokens: true, outputTokens: true },
      }),
      []
    ),
    sicher("Stripe-Webhooks", prisma.stripeEventLog.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true, type: true } }), null),
    sicher(
      "Hängende Webhooks",
      prisma.stripeEventLog.count({ where: { processedAt: null, receivedAt: { lt: new Date(jetzt.getTime() - 10 * 60_000) } } }),
      0
    ),
    sicher(
      "Cron-Läufe",
      prisma.productEvent.findMany({ where: { name: "cron_run" }, orderBy: { createdAt: "desc" }, take: 20, select: { createdAt: true, props: true } }),
      []
    ),
    sicher("Abos", prisma.user.count({ where: { subscriptionStatus: "pro", role: { not: "admin" } } }), 0),
    sicher("Pässe", prisma.user.count({ where: { proBonusUntil: { gt: jetzt } } }), 0),
    sicher("Testphasen", prisma.user.count({ where: { proTrialEndsAt: { gt: jetzt } } }), 0),
    sicher("Fragenpool", prisma.poolQuestion.count({ where: { status: "active" } }), 0),
    sicher("Gemeldete Fragen", prisma.poolQuestion.count({ where: { status: "active", reportCount: { gt: 0 } } }), 0),
    sicher("Feedback", prisma.userFeedback.count({ where: { createdAt: { gte: seit24 } } }), 0),
  ])
  const verwaisteAbos = await sicher(
    "Verwaiste Abos",
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "Subscription" s LEFT JOIN "User" u ON u."id" = s."userId" WHERE u."id" IS NULL`.then((r) => r[0]?.n ?? 0),
    0
  )

  // --- Konfiguration ---
  const stripe = getStripeConfig()
  const tarife = await diagnosePlans().catch(() => [])
  const preise = modelPrices()
  const preisBekannt = costUsd(GENERATOR_MODEL, { inputTokens: 1, cachedTokens: 0, outputTokens: 1 }, preise) !== null
  const kostenHeute = kiVerbrauch.reduce((s, r) => {
    const c = costUsd(r.model, { inputTokens: r._sum.inputTokens ?? 0, cachedTokens: r._sum.cachedTokens ?? 0, outputTokens: r._sum.outputTokens ?? 0 }, preise)
    return s + (c ?? 0)
  }, 0)

  const konfiguration: Zeile[] = [
    { titel: "OpenAI-Schlüssel", wert: gesetzt("OPENAI_API_KEY") ? "gesetzt" : "fehlt", ampel: gesetzt("OPENAI_API_KEY") ? "ok" : "fehler" },
    {
      titel: "Generator-Modell",
      wert: GENERATOR_MODEL,
      ampel: gesetzt("OPENAI_MODEL_GENERATOR") ? "ok" : "warn",
      hinweis: gesetzt("OPENAI_MODEL_GENERATOR") ? undefined : "OPENAI_MODEL_GENERATOR fehlt — es greift der Standard",
    },
    {
      titel: "KI-Preise für Kostenmessung",
      wert: preisBekannt ? "bekannt" : "fehlen",
      ampel: preisBekannt ? "ok" : "warn",
      hinweis: preisBekannt ? undefined : `AI_PRICES_JSON um "${GENERATOR_MODEL}" ergänzen`,
    },
    { titel: "Stripe-Modus", wert: stripe.mode, ampel: stripe.mode === "live" && !stripe.mixedMode ? "ok" : "fehler", hinweis: stripe.issues.join(" · ") || undefined },
    { titel: "Stripe-Webhook-Secret", wert: stripe.webhookSecret ? "gesetzt" : "fehlt", ampel: stripe.webhookSecret ? "ok" : "fehler" },
    ...tarife.map(
      (t): Zeile => ({
        titel: `Tarif ${t.plan}`,
        wert: t.ok ? `${t.betrag ?? ""} ✓` : t.gesetzt ? "Fehler" : "nicht angeboten",
        ampel: t.ok ? "ok" : t.plan === "pro_monthly" ? "fehler" : t.gesetzt ? "fehler" : "warn",
        hinweis: t.ok ? undefined : t.problem ?? undefined,
      })
    ),
    { titel: "Cron-Secret", wert: gesetzt("CRON_SECRET") ? "gesetzt" : "fehlt", ampel: gesetzt("CRON_SECRET") ? "ok" : "fehler", hinweis: gesetzt("CRON_SECRET") ? undefined : "Erinnerungen und Löschfristen laufen nicht" },
    {
      titel: "Mailversand (SMTP)",
      wert: gesetzt("EMAIL_SERVER_USER") && gesetzt("EMAIL_SERVER_PASSWORD") ? "konfiguriert" : "unvollständig",
      ampel: gesetzt("EMAIL_SERVER_USER") && gesetzt("EMAIL_SERVER_PASSWORD") ? "ok" : "fehler",
    },
    { titel: "Web-Push", wert: pushConfigured() ? "aktiv" : "aus (nur Mail)", ampel: pushConfigured() ? "ok" : "warn" },
    { titel: "App-URL", wert: process.env.NEXT_PUBLIC_APP_URL?.trim() || "Standard (fragenkreuzen.de)", ampel: "ok" },
  ]

  // --- Betrieb ---
  const fehlerquote = kiGesamt > 0 ? kiFehler / kiGesamt : 0
  const cap = globalRefillCap()
  const letzterCron = (job: string) => {
    const e = cronLaeufe.find((c) => (c.props as { job?: string } | null)?.job === job)
    return e ? { am: e.createdAt, props: e.props as Record<string, unknown> } : null
  }
  const cronZeile = (job: string, titel: string): Zeile => {
    const c = letzterCron(job)
    const alt = !c || Date.now() - c.am.getTime() > 26 * STUNDE
    const unvollstaendig = c?.props?.unvollstaendig === true
    return {
      titel,
      wert: c ? vor(c.am) : "noch nie gelaufen",
      ampel: alt ? "fehler" : unvollstaendig ? "warn" : "ok",
      hinweis: alt
        ? "Seit über 26 h kein Lauf — Vercel → Cron Jobs prüfen"
        : unvollstaendig
          ? "Zeitbudget erreicht, nicht alle Nutzer bearbeitet"
          : c
            ? Object.entries(c.props).filter(([k]) => k !== "job").map(([k, v]) => `${k}: ${v}`).join(" · ")
            : undefined,
    }
  }

  const betrieb: Zeile[] = [
    { titel: "Datenbank", wert: dbOk ? `${dbMs} ms` : "nicht erreichbar", ampel: !dbOk ? "fehler" : dbMs > 800 ? "warn" : "ok", hinweis: dbMs > 800 ? "Langsam — evtl. Kaltstart von Neon" : undefined },
    ...(abfrageFehler.length
      ? [{ titel: "Statusabfragen", wert: `${abfrageFehler.length} fehlgeschlagen`, ampel: "fehler" as const, hinweis: abfrageFehler.join(" · ") }]
      : []),
    {
      titel: "KI-Aufrufe (24 h)",
      wert: `${kiGesamt} · ${Math.round(fehlerquote * 100)} % Fehler`,
      ampel: fehlerquote > 0.15 ? "fehler" : fehlerquote > 0.05 ? "warn" : "ok",
      hinweis: kiFehlerNachZweck.length ? kiFehlerNachZweck.map((f) => `${f.purpose}: ${f._count._all}`).join(" · ") : undefined,
    },
    { titel: "Generierungen fehlgeschlagen (24 h)", wert: String(genFehlgeschlagen), ampel: genFehlgeschlagen > 20 ? "warn" : "ok" },
    {
      titel: "Neuerzeugung im Kreuz-Modus (24 h)",
      wert: `${kreuzGen} von ${cap}`,
      ampel: kreuzGen >= cap ? "fehler" : kreuzGen > cap * 0.8 ? "warn" : "ok",
      hinweis: kreuzGen >= cap ? "Notbremse aktiv — KREUZEN_GEN_DAILY_CAP anheben?" : undefined,
    },
    { titel: "KI-Kosten (24 h)", wert: preisBekannt ? `${kostenHeute.toFixed(2)} $` : "unbekannt", ampel: "ok" },
    {
      titel: "Stripe-Webhooks",
      wert: letzteWebhooks ? `zuletzt ${vor(letzteWebhooks.receivedAt)} (${letzteWebhooks.type})` : "noch keiner",
      ampel: haengendeWebhooks > 0 ? "fehler" : "ok",
      hinweis: haengendeWebhooks > 0 ? `${haengendeWebhooks} Ereignis(se) nicht fertig verarbeitet — unter „Stripe-Abgleich“ prüfen` : undefined,
    },
    {
      titel: "Verwaiste Abos",
      wert: String(verwaisteAbos),
      ampel: verwaisteAbos > 0 ? "warn" : "ok",
      hinweis: verwaisteAbos > 0 ? "Abo-Zeilen ohne Konto — unter „Stripe-Abgleich“ prüfen, ob Stripe noch abbucht" : undefined,
    },
    cronZeile("reminders", "Cron: Erinnerungen"),
    cronZeile("cleanup", "Cron: Löschfristen"),
    { titel: "Mails fehlgeschlagen (24 h)", wert: String(mailFehler), ampel: mailFehler > 10 ? "fehler" : mailFehler > 0 ? "warn" : "ok", hinweis: mailFehler > 0 ? "SMTP-Kontingent oder Zugangsdaten prüfen" : undefined },
  ]

  const nutzung: Zeile[] = [
    { titel: "Registrierungen (24 h)", wert: String(signups), ampel: "ok" },
    { titel: "Beantwortete Fragen (24 h)", wert: String(beantwortet), ampel: "ok" },
    { titel: "Erinnerungen versendet (24 h)", wert: String(erinnerungen), ampel: "ok" },
    { titel: "Käufe / Kündigungen (24 h)", wert: `${aboStart} / ${aboEnde}`, ampel: "ok" },
    { titel: "Pro aktiv", wert: `${aboAktiv} Abo · ${paesseAktiv} Pass/Bonus · ${testphasenAktiv} Testphase`, ampel: "ok" },
    { titel: "Fragenpool", wert: `${poolAktiv} aktiv`, ampel: "ok" },
    {
      titel: "Gemeldete Fragen",
      wert: String(poolGemeldet),
      ampel: poolGemeldet > 0 ? "warn" : "ok",
      hinweis: poolGemeldet > 0 ? "Unter „Gemeldete Fragen“ prüfen" : undefined,
    },
    { titel: "Feedback (24 h)", wert: String(feedback24), ampel: "ok" },
  ]

  const alle = [...konfiguration, ...betrieb, ...nutzung]
  const rot = alle.filter((z) => z.ampel === "fehler").length
  const gelb = alle.filter((z) => z.ampel === "warn").length

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Systemstatus</h1>
          <p className="text-sm text-muted-foreground">Stand {jetzt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>
        </div>
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white ${rot ? "bg-red-600" : gelb ? "bg-amber-600" : "bg-emerald-600"}`}
        >
          {rot ? `${rot} Problem${rot > 1 ? "e" : ""}` : gelb ? `${gelb} Hinweis${gelb > 1 ? "e" : ""}` : "Alles in Ordnung"}
        </div>
      </div>

      <Abschnitt titel="Betrieb" zeilen={betrieb} />
      <Abschnitt titel="Konfiguration" zeilen={konfiguration} />
      <Abschnitt titel="Nutzung" zeilen={nutzung} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/stripe" className="rounded-full border px-3 py-1.5 hover:bg-muted">Stripe-Abgleich</Link>
        <Link href="/admin/meldungen" className="rounded-full border px-3 py-1.5 hover:bg-muted">Gemeldete Fragen</Link>
        <Link href="/admin/nutzer" className="rounded-full border px-3 py-1.5 hover:bg-muted">Nutzer suchen</Link>
        <Link href="/admin/metrics" className="rounded-full border px-3 py-1.5 hover:bg-muted">Kennzahlen</Link>
        <Link href="/api/admin/stripe-plans" className="rounded-full border px-3 py-1.5 hover:bg-muted">Tarif-Diagnose (JSON)</Link>
        <Link href="/api/admin/ai-config" className="rounded-full border px-3 py-1.5 hover:bg-muted">KI-Konfiguration (JSON)</Link>
      </div>
    </div>
  )
}

function Abschnitt({ titel, zeilen }: { titel: string; zeilen: Zeile[] }) {
  return (
    <section className="rounded-2xl border bg-card">
      <h2 className="border-b px-4 py-2.5 text-sm font-semibold">{titel}</h2>
      <ul className="divide-y">
        {zeilen.map((z) => (
          <li key={z.titel} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${farbe(z.ampel)}`} aria-label={z.ampel} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{z.titel}</span>
                <span className="tabular-nums text-muted-foreground">{z.wert}</span>
              </div>
              {z.hinweis && <div className="mt-0.5 text-xs text-muted-foreground">{z.hinweis}</div>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

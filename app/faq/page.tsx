import type { Metadata } from "next"
import Link from "next/link"
import {
  GENERATOR_FREE_DAILY_LIMIT,
  GENERATOR_PRO_DAILY_LIMIT,
} from "@/lib/generator-plan-config"

export const dynamic = "force-static"
export const revalidate = 86400

export const metadata: Metadata = {
  title: "Häufige Fragen (FAQ) | fragenkreuzen.de",
  description:
    "Antworten zu Fragenqualität, Tarifen, Kündigung, Widerruf, Zahlung und Datenschutz bei fragenkreuzen.de.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Häufige Fragen | fragenkreuzen.de",
    description: "Alles zu Tarifen, Kündigung, Widerruf und Datenschutz.",
    type: "website",
  },
}

type FaqItem = {
  q: string
  /** Reiner Text für das JSON-LD (ohne Markup). */
  plain: string
  /** Gerenderte Antwort mit Links. */
  a: React.ReactNode
}

const FAQ: FaqItem[] = [
  {
    q: "Was ist fragenkreuzen.de?",
    plain:
      "fragenkreuzen.de ist ein KI-gestützter Generator für medizinische Prüfungsfragen. Du wählst Thema und Schwierigkeitsgrad und erhältst Single-Choice-Fragen und Fallvignetten im Stil des Staatsexamens, inklusive ausführlicher Erklärungen zu allen Antwortmöglichkeiten.",
    a: (
      <>
        fragenkreuzen.de ist ein KI-gestützter Generator für medizinische
        Prüfungsfragen. Du wählst Thema und Schwierigkeitsgrad – und erhältst
        Single-Choice-Fragen und Fallvignetten im Stil des Staatsexamens, inklusive
        ausführlicher Erklärungen zu allen Antwortmöglichkeiten.{" "}
        <Link href="/probieren">Kostenlos testen</Link>.
      </>
    ),
  },
  {
    q: "Sind die Fragen echte IMPP-Fragen?",
    plain:
      "Nein. Alle Fragen werden neu generiert und orientieren sich am Stil und Anspruch der Examensfragen, sind aber keine Original-IMPP-Fragen. Damit trainierst du das Prinzip des Kreuzens, ohne Altfragen auswendig zu lernen.",
    a: (
      <>
        Nein. Alle Fragen werden von unserer KI neu generiert und orientieren sich am
        Stil und Anspruch der Examensfragen, sind aber <strong>keine</strong>{" "}
        Original-IMPP-Fragen. Damit trainierst du das Prinzip des Kreuzens, ohne
        Altfragen auswendig zu lernen.
      </>
    ),
  },
  {
    q: "Können die KI-generierten Fragen Fehler enthalten?",
    plain:
      "Ja, das ist möglich. Trotz sorgfältiger Konfiguration kann ein KI-Modell fachliche Fehler machen. Die Inhalte dienen ausschließlich der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.",
    a: (
      <>
        Ja, das ist möglich. Trotz sorgfältiger Konfiguration kann ein KI-Modell
        fachliche Fehler machen. Die Inhalte dienen ausschließlich der
        Prüfungsvorbereitung und stellen <strong>keine medizinische Beratung</strong>{" "}
        dar. Verlass dich für verbindliche Informationen immer auf Lehrbücher und
        aktuelle Leitlinien – und melde uns fehlerhafte Fragen gern über das
        Feedback-Widget, damit wir besser werden.
      </>
    ),
  },
  {
    q: "Was kostet fragenkreuzen.de?",
    plain: `Der Free-Tarif ist dauerhaft kostenlos und erlaubt ${GENERATOR_FREE_DAILY_LIMIT} Generierungen pro Tag. Der Pro-Tarif kostet 9,99 Euro pro Monat als Endpreis; als Kleinunternehmer nach § 19 UStG erheben wir keine Umsatzsteuer. Pro bietet ${GENERATOR_PRO_DAILY_LIMIT} Generierungen pro Tag.`,
    a: (
      <>
        Der Free-Tarif ist dauerhaft kostenlos und erlaubt{" "}
        {GENERATOR_FREE_DAILY_LIMIT} Generierungen pro Tag. Der Pro-Tarif kostet{" "}
        <strong>9,99 € pro Monat</strong> und bietet {GENERATOR_PRO_DAILY_LIMIT}{" "}
        Generierungen pro Tag, lange Fallvignetten und die vollen
        Schwierigkeitsstufen. Endpreis – gemäß § 19 UStG erheben wir als
        Kleinunternehmer keine Umsatzsteuer und weisen daher keine aus.{" "}
        <Link href="/pricing">Zum Preisvergleich</Link>.
      </>
    ),
  },
  {
    q: "Wie kann ich mein Pro-Abo kündigen?",
    plain:
      "Jederzeit zum Ende der laufenden Abrechnungsperiode – über die Seite „Verträge hier kündigen“ (ohne Anmeldung), über die Kündigungsfunktion in deiner Abo-Verwaltung oder formlos per E-Mail an info@ultima-rat.io. Dein Pro-Zugang bleibt bis zum Ende der bezahlten Periode aktiv.",
    a: (
      <>
        Jederzeit zum Ende der laufenden Abrechnungsperiode – über die Seite{" "}
        <Link href="/kuendigung">Verträge hier kündigen</Link> (funktioniert ohne
        Anmeldung), über die Kündigungsfunktion in deiner{" "}
        <Link href="/subscription">Abo-Verwaltung</Link> oder formlos per E-Mail an{" "}
        <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>. Dein Pro-Zugang
        bleibt bis zum Ende der bezahlten Periode aktiv; danach wechselst du
        automatisch in den Free-Tarif.
      </>
    ),
  },
  {
    q: "Habe ich ein Widerrufsrecht?",
    plain:
      "Ja. Als Verbraucher kannst du den kostenpflichtigen Vertrag innerhalb von 14 Tagen nach Vertragsschluss widerrufen. Details und ein Muster-Widerrufsformular findest du in der Widerrufsbelehrung.",
    a: (
      <>
        Ja. Als Verbraucher kannst du den kostenpflichtigen Vertrag innerhalb von{" "}
        <strong>14 Tagen</strong> nach Vertragsschluss widerrufen. Alle Details und
        ein Muster-Widerrufsformular findest du in unserer{" "}
        <Link href="/widerruf">Widerrufsbelehrung</Link>.
      </>
    ),
  },
  {
    q: "Wie wird bezahlt?",
    plain:
      "Die Zahlung wird über den Zahlungsdienstleister Stripe abgewickelt. Deine vollständigen Zahlungsdaten werden nicht auf unseren Servern gespeichert.",
    a: (
      <>
        Die Zahlung wird sicher über unseren Zahlungsdienstleister{" "}
        <strong>Stripe</strong> abgewickelt. Deine vollständigen Zahlungsdaten (z. B.
        Kartennummer) werden <strong>nicht</strong> auf unseren Servern gespeichert.
        Rechnungen und Zahlungsmethode verwaltest du im Stripe-Kundenportal, das du
        in deinem <Link href="/account">Account</Link> erreichst.
      </>
    ),
  },
  {
    q: "Was passiert mit meinen Daten?",
    plain:
      "Wir erheben nur die Daten, die für den Betrieb des Dienstes nötig sind. Analyse- und Werbe-Cookies setzen wir nur nach aktiver Einwilligung im Cookie-Banner. Bei der Fragengenerierung werden nur die gewählten Parameter an den KI-Anbieter übermittelt, nicht dein Name oder deine E-Mail-Adresse.",
    a: (
      <>
        Wir erheben nur die Daten, die für den Betrieb des Dienstes nötig sind.
        Analyse- und Werbe-Cookies (Google Analytics, Google Ads) setzen wir{" "}
        <strong>nur</strong>, wenn du im Cookie-Banner aktiv zustimmst – deine
        Auswahl kannst du jederzeit über „Cookie-Einstellungen" im Footer ändern. Bei
        der Fragengenerierung werden nur deine gewählten Parameter (Thema,
        Schwierigkeitsgrad) an unseren KI-Anbieter übermittelt – nicht dein Name oder
        deine E-Mail-Adresse. Alle Details in der{" "}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </>
    ),
  },
  {
    q: "Für welche Examina eignet sich fragenkreuzen.de?",
    plain:
      "Der Generator ist auf die schriftlichen Prüfungen des Medizinstudiums ausgerichtet, insbesondere das zweite Staatsexamen (M2). Durch die freie Themen- und Schwierigkeitswahl lässt er sich auch für Klausuren und andere Prüfungsphasen nutzen.",
    a: (
      <>
        Der Generator ist auf die schriftlichen Prüfungen des Medizinstudiums
        ausgerichtet, insbesondere das <strong>zweite Staatsexamen (M2)</strong>.
        Durch die freie Themen- und Schwierigkeitswahl kannst du ihn aber auch für
        Klausuren, das Physikum, die Zahnmedizin-Examina und andere Prüfungsphasen
        nutzen.
      </>
    ),
  },
  {
    q: "Ich habe einen Fehler gefunden – wie erreiche ich euch?",
    plain:
      "Schreib uns an info@ultima-rat.io oder nutze das Feedback-Widget unten rechts auf jeder Seite.",
    a: (
      <>
        Schreib uns an <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a> oder
        nutze das <strong>Feedback-Widget</strong> unten rechts auf jeder Seite. Wir
        freuen uns über jedes Feedback.
      </>
    ),
  },
]

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "de-DE",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.plain },
    })),
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Häufige Fragen</h1>
        <p className="text-muted-foreground">
          Kurz und ehrlich beantwortet. Fehlt etwas? Schreib uns an{" "}
          <a
            href="mailto:info@ultima-rat.io"
            className="underline underline-offset-2 hover:text-foreground"
          >
            info@ultima-rat.io
          </a>
          .
        </p>
      </header>

      <div className="mt-8 divide-y rounded-2xl border bg-card">
        {FAQ.map((item) => (
          <details key={item.q} className="group px-5 py-4 open:bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground marker:hidden">
              {item.q}
              <svg
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground">
              {item.a}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Rechtliches auf einen Blick</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            { href: "/impressum", label: "Impressum" },
            { href: "/agb", label: "AGB" },
            { href: "/widerruf", label: "Widerrufsbelehrung" },
            { href: "/datenschutz", label: "Datenschutzerklärung" },
            { href: "/kuendigung", label: "Verträge hier kündigen" },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex h-8 items-center rounded-full border bg-background px-3 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

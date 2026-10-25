import { getAppBaseUrl } from "@/lib/app-base-url"
import { formatAmount, istPass, PLAN_NAME, type PlanId } from "@/lib/stripe-plans"

/**
 * Vertragsbestätigung auf einem dauerhaften Datenträger (§ 312f Abs. 2 BGB):
 * eine E-Mail mit den wesentlichen Vertragsdaten, der AGB und der
 * Widerrufsbelehrung als Anhang — im Stand zum Zeitpunkt des Vertragsschlusses.
 */

const ANBIETER = "Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR, Hallesche Straße 94a, 44143 Dortmund"

export type Bestaetigung = {
  plan: PlanId
  betragCents: number | null
  waehrung: string
  /** Bei Pässen: Ende des Pro-Zugangs (null, solange die Zahlung noch aussteht). */
  endetAm: Date | null
  jetzt?: Date
}

function datum(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" })
}

export function bestaetigungsText(b: Bestaetigung): { subject: string; text: string } {
  const jetzt = b.jetzt ?? new Date()
  const preis = b.betragCents !== null ? formatAmount(b.betragCents, b.waehrung) : "laut Bestellung"
  const zeilen = [
    "Hallo,",
    "",
    "vielen Dank für deine Bestellung. Hiermit bestätigen wir den Vertrag:",
    "",
    `Leistung: ${PLAN_NAME[b.plan]} — Pro-Zugang auf fragenkreuzen.de`,
    istPass(b.plan) ? `Preis: ${preis} einmalig (Endpreis)` : `Preis: ${preis} pro Monat (Endpreis)`,
    "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    `Vertragsschluss: ${datum(jetzt)}`,
  ]
  if (istPass(b.plan)) {
    zeilen.push(
      b.endetAm
        ? `Laufzeit: bis ${datum(b.endetAm)}. Der Pass endet automatisch, es gibt keine Verlängerung und nichts zu kündigen.`
        : "Laufzeit: ab Zahlungseingang. Der Pass endet automatisch, es gibt keine Verlängerung und nichts zu kündigen."
    )
  } else {
    zeilen.push(
      "Laufzeit: monatlich; das Abo verlängert sich jeweils um einen Monat.",
      `Kündigung: jederzeit zum Ende des laufenden Monats, ohne Anmeldung unter ${getAppBaseUrl()}/kuendigung`
    )
  }
  zeilen.push(
    "",
    "Widerruf: Du kannst den Vertrag 14 Tage lang ohne Angabe von Gründen widerrufen und bekommst dann den vollen Betrag zurück — auch wenn du Pro bereits genutzt hast. Details in der beigefügten Widerrufsbelehrung.",
    "",
    "Im Anhang findest du unsere AGB und die Widerrufsbelehrung in der Fassung, die für deinen Vertrag gilt.",
    "",
    `Anbieterin: ${ANBIETER}`,
    "E-Mail: info@ultima-rat.io",
    "",
    "Viel Erfolg beim Kreuzen!"
  )
  return { subject: `Bestellbestätigung: ${PLAN_NAME[b.plan]} bei fragenkreuzen`, text: zeilen.join("\n") }
}

/** Lädt die aktuelle Fassung einer Rechtsseite als eigenständige HTML-Datei (ohne Skripte). */
async function rechtsseite(pfad: string): Promise<string | null> {
  try {
    const res = await fetch(`${getAppBaseUrl()}${pfad}`, { signal: AbortSignal.timeout(8000), cache: "no-store" })
    if (!res.ok) return null
    const html = await res.text()
    return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<link[^>]+rel="preload"[^>]*>/gi, "")
  } catch {
    return null
  }
}

export async function sendeVertragsbestaetigung(an: string, b: Bestaetigung): Promise<void> {
  const { sendMail } = await import("@/lib/mail")
  const { subject, text } = bestaetigungsText(b)
  const [agb, widerruf] = await Promise.all([rechtsseite("/agb"), rechtsseite("/widerruf")])
  const attachments = [
    agb ? { filename: "AGB-fragenkreuzen.html", content: agb, contentType: "text/html; charset=utf-8" } : null,
    widerruf ? { filename: "Widerrufsbelehrung-fragenkreuzen.html", content: widerruf, contentType: "text/html; charset=utf-8" } : null,
  ].filter((a): a is { filename: string; content: string; contentType: string } => a !== null)
  // Anhänge nicht abrufbar → mindestens die Links, damit die Mail nie ganz ohne Vertragsinhalt bleibt.
  const nachsatz =
    attachments.length < 2 ? `\n\nAGB: ${getAppBaseUrl()}/agb\nWiderrufsbelehrung: ${getAppBaseUrl()}/widerruf` : ""
  await sendMail({ to: an, subject, text: text + nachsatz, attachments })
}

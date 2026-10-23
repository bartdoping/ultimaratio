
/**
 * Betriebsalarme an die Admin-Adresse.
 *
 * Im September stand der Generator still, weil das OpenAI-Guthaben leer war —
 * bemerkt hat es zuerst niemand. Solche Ausfälle melden sich jetzt selbst.
 *
 * Gedrosselt auf eine Mail pro Alarmart und Stunde je Server-Instanz: Bei
 * einem Ausfall scheitert JEDE Anfrage, ohne Drossel käme eine Mail pro Nutzer.
 */

export type OpsAlertKind = "openai_quota" | "openai_auth" | "generator_failing" | "kreuzen_cap"

const zuletzt = new Map<OpsAlertKind, number>()
const SPERRE_MS = 60 * 60 * 1000

const TEXTE: Record<OpsAlertKind, { betreff: string; text: string }> = {
  openai_quota: {
    betreff: "OpenAI-Guthaben erschöpft — Generator und Tutor fallen aus",
    text: "Die OpenAI-API meldet: kein Guthaben. Fragengenerator und KI-Tutor liefern keine Ergebnisse, bis unter https://platform.openai.com/settings/organization/billing nachgeladen wird.",
  },
  openai_auth: {
    betreff: "OpenAI-Schlüssel abgelehnt — Generator fällt aus",
    text: "Die OpenAI-API lehnt den API-Schlüssel ab (401/403). OPENAI_API_KEY in Vercel prüfen.",
  },
  kreuzen_cap: {
    betreff: "Kreuz-Modus: Tagesgrenze für neue Fragen erreicht",
    text: "Die globale Tagesgrenze für Neugenerierungen im Kreuz-Modus ist erreicht. Nutzer bekommen weiter Fragen aus dem Pool, aber keine neuen Themen. Grenze anheben über KREUZEN_GEN_DAILY_CAP in Vercel (Standard 2000 pro 24 h).",
  },
  generator_failing: {
    betreff: "Fragengenerator: auffällig viele Fehler",
    text: "Mehrere Generierungen in kurzer Folge sind gescheitert. Details im Vercel-Log unter [generator].",
  },
}

function empfaenger(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "info@ultima-rat.io"
}

export function sendOpsAlert(kind: OpsAlertKind, detail?: string): void {
  const jetzt = Date.now()
  const letzte = zuletzt.get(kind) ?? 0
  if (jetzt - letzte < SPERRE_MS) return
  zuletzt.set(kind, jetzt)

  const t = TEXTE[kind]
  // Erst beim Senden laden: Die KI-Schicht importiert diesen Alarm, und der
  // Mailversand (nodemailer, server-only) soll dort keine Abhängigkeit sein.
  void import("@/lib/mail")
    .then(({ sendMail }) => sendMail({
    to: empfaenger(),
    subject: `[fragenkreuzen · Alarm] ${t.betreff}`,
    text: [t.text, detail ? `\nDetail: ${detail.slice(0, 300)}` : "", `\nZeit: ${new Date(jetzt).toISOString()}`].join(""),
    }))
    .catch((err) => console.error("[ops-alert] Mail fehlgeschlagen:", err))
}

/** Nur für Tests. */
export function __resetOpsAlerts(): void {
  zuletzt.clear()
}

import prisma from "@/lib/db"

/**
 * Produktereignisse — die Zahlen, ohne die sich das Produkt nicht steuern lässt:
 * Fragen pro Sitzung, Rückkehr nach 1/7/30 Tagen, Free→Pro, Kündigungen.
 *
 * Datenschutz:
 *  - Serverseitig in der eigenen Datenbank, kein Drittanbieter, kein Cookie.
 *  - Angemeldete Nutzer: mit Nutzer-ID (Art. 6 Abs. 1 lit. f DSGVO —
 *    berechtigtes Interesse an der Verbesserung des Dienstes; in der
 *    Datenschutzerklärung beschrieben). Mit dem Konto gelöscht.
 *  - Anonyme Besucher: OHNE jede Kennung. Daraus lassen sich nur Summen bilden,
 *    keine Verläufe — genau deshalb ist keine Einwilligung nötig.
 *
 * "Fire and forget": Ein Messfehler darf nie eine Nutzeraktion stören.
 */

export const PRODUCT_EVENTS = [
  "session_start",
  "question_served",
  "question_answered",
  "explanation_deepdive",
  "generation_requested",
  "generation_failed",
  "share_copied",
  "share_card_opened",
  "upgrade_clicked",
  "checkout_started",
  "subscription_started",
  "subscription_canceled",
  "cancellation_submitted",
  "signup",
  "referral_rewarded",
  "reminder_sent",
  "pwa_installed",
] as const

export type ProductEventName = (typeof PRODUCT_EVENTS)[number]

export function isProductEventName(v: unknown): v is ProductEventName {
  return typeof v === "string" && (PRODUCT_EVENTS as readonly string[]).includes(v)
}

/** Ereignisse, die der Browser melden darf. Alles Geld- und Kontobezogene meldet nur der Server. */
export const CLIENT_EVENTS: readonly ProductEventName[] = [
  "session_start",
  "share_copied",
  "upgrade_clicked",
  "pwa_installed",
]

/** Props klein und flach halten — keine Freitexte, keine personenbezogenen Inhalte. */
function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!props) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props).slice(0, 12)) {
    if (typeof v === "number" || typeof v === "boolean") out[k] = v
    else if (typeof v === "string") out[k] = v.slice(0, 80)
  }
  return out
}

export function track(
  name: ProductEventName,
  opts: { userId?: string | null; props?: Record<string, unknown> } = {}
): void {
  void prisma.productEvent
    .create({
      data: {
        name,
        userId: opts.userId ?? null,
        props: sanitizeProps(opts.props) as object | undefined,
      },
    })
    .catch(() => {
      // Messung ist nie wichtiger als die Funktion.
    })
}

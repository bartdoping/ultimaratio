import prisma from "@/lib/db"

/**
 * Darf der Kreuz-Modus jetzt eine neue Frage erzeugen?
 *
 * Neugenerierungen im Kreuz-Modus zählen NICHT gegen das Generator-Kontingent
 * (3/Tag) — sonst bricht der Strom bei einem neuen Thema nach drei Fragen ab,
 * obwohl 10 bzw. 25 Fragen zustehen. Jede erzeugte Frage zählt stattdessen
 * wie jede andere gegen das Kreuz-Kontingent. Zusätzlich:
 *
 *  - Pro: eigene Tagesgrenze (Pro kreuzt unbegrenzt, erzeugt aber nicht
 *    unbegrenzt neu — der Pool wächst ja für alle mit).
 *  - Global: Notbremse für das OpenAI-Guthaben. Ist sie erreicht, gibt es
 *    weiter alles, was schon im Pool liegt, nur nichts Neues — und einen Alarm.
 *
 * Gezählt wird über die Produktereignisse der letzten 24 Stunden (ohne
 * eigene Tabelle). Fehlgeschlagene Versuche zählen mit: Sie kosten auch.
 */

export const REFILL_LIMITS = {
  PRO_PER_DAY: 150,
  GLOBAL_PER_DAY_DEFAULT: 2000,
} as const

export function globalRefillCap(): number {
  const n = Number(process.env.KREUZEN_GEN_DAILY_CAP)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : REFILL_LIMITS.GLOBAL_PER_DAY_DEFAULT
}

export type RefillDecision = { ok: true } | { ok: false; grund: "kapazitaet"; global: boolean }

export function refillDecision(i: {
  isPro: boolean
  userCount: number
  globalCount: number
  globalCap: number
}): RefillDecision {
  if (i.globalCount >= i.globalCap) return { ok: false, grund: "kapazitaet", global: true }
  if (i.isPro && i.userCount >= REFILL_LIMITS.PRO_PER_DAY) return { ok: false, grund: "kapazitaet", global: false }
  return { ok: true }
}

const VIA_KREUZEN = { path: ["via"], equals: "kreuzen" } as const

export async function poolRefillAllowed(opts: { userId: string | null; isPro: boolean }): Promise<RefillDecision> {
  const seit = new Date(Date.now() - 86_400_000)
  try {
    const [globalCount, userCount] = await Promise.all([
      prisma.productEvent.count({ where: { name: "generation_requested", createdAt: { gte: seit }, props: VIA_KREUZEN } }),
      opts.isPro && opts.userId
        ? prisma.productEvent.count({
            where: { name: "generation_requested", userId: opts.userId, createdAt: { gte: seit }, props: VIA_KREUZEN },
          })
        : Promise.resolve(0),
    ])
    return refillDecision({ isPro: opts.isPro, userCount, globalCount, globalCap: globalRefillCap() })
  } catch {
    // Zählung nicht möglich → nicht blockieren; das Kreuz-Kontingent greift weiterhin.
    return { ok: true }
  }
}

import { randomInt } from "crypto"
import prisma from "@/lib/db"
import { extendBonus } from "@/lib/subscription"
import { track } from "@/lib/product-events"

/**
 * Empfehlungen und Creator-Codes.
 *
 * Ein Link für beides: /r/CODE. Gehört der Code einem Nutzer, ist es eine
 * Empfehlung — beide bekommen einen Monat Pro, sobald die eingeladene Person
 * wirklich kreuzt (bestätigte E-Mail + 20 beantwortete Fragen). So lohnen
 * sich Wegwerf-Konten nicht. Gehört der Code einem Creator, wird die
 * Registrierung ihm zugeordnet (Provision wird manuell abgerechnet).
 */

export const REFERRAL = {
  BONUS_DAYS: 30,
  MIN_ANSWERS: 20,
  /** Höchstens so viele belohnte Empfehlungen pro Person. */
  MAX_REWARDS: 12,
  COOKIE: "fk_ref",
  COOKIE_MAX_AGE: 30 * 24 * 60 * 60,
} as const

// Ohne verwechselbare Zeichen (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function generateReferralCode(len = 7): string {
  let s = ""
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

/** Codes sind unabhängig von Groß-/Kleinschreibung; nur A–Z, 0–9, 3–24 Zeichen. */
export function normalizeCode(raw: string | null | undefined): string | null {
  const c = String(raw ?? "").trim().toUpperCase()
  return /^[A-Z0-9]{3,24}$/.test(c) ? c : null
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (u?.referralCode) return u.referralCode
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode()
    const kollidiert = await prisma.creatorCode.findUnique({ where: { code }, select: { id: true } })
    if (kollidiert) continue
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
      return code
    } catch {
      // Eindeutigkeit verletzt — neuer Versuch.
    }
  }
  throw new Error("referral_code_failed")
}

/** Zuordnung bei der Registrierung aus dem Einladungs-Code. */
export async function attributionForCode(
  raw: string | null | undefined
): Promise<{ referredById?: string; creatorCodeId?: string }> {
  const code = normalizeCode(raw)
  if (!code) return {}
  const werber = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
  if (werber) return { referredById: werber.id }
  const creator = await prisma.creatorCode.findUnique({ where: { code }, select: { id: true, active: true } })
  if (creator?.active) return { creatorCodeId: creator.id }
  return {}
}

/** Liest den Einladungs-Code aus dem Cookie (nur in Route Handlern / Server-Kontext). */
export async function attributionFromCookie(): Promise<{ referredById?: string; creatorCodeId?: string }> {
  try {
    const { cookies } = await import("next/headers")
    const jar = await cookies()
    return await attributionForCode(jar.get(REFERRAL.COOKIE)?.value)
  } catch {
    return {}
  }
}

/**
 * Prüft nach einer Antwort, ob die Empfehlung jetzt belohnt wird.
 * Idempotent: Die Belohnung wird über referralRewardedAt genau einmal beansprucht.
 */
export async function maybeRewardReferral(userId: string): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true, referralRewardedAt: true, emailVerifiedAt: true },
    })
    if (!u?.referredById || u.referralRewardedAt || !u.emailVerifiedAt) return false
    const antworten = await prisma.poolAnswer.count({ where: { userId } })
    if (antworten < REFERRAL.MIN_ANSWERS) return false

    const bisher = await prisma.user.count({
      where: { referredById: u.referredById, referralRewardedAt: { not: null } },
    })
    // Beanspruchen — gewinnt nur einmal, auch bei parallelen Anfragen.
    const claim = await prisma.user.updateMany({
      where: { id: userId, referralRewardedAt: null },
      data: { referralRewardedAt: new Date() },
    })
    if (claim.count === 0) return false

    const [ich, werber] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { proBonusUntil: true } }),
      prisma.user.findUnique({ where: { id: u.referredById }, select: { proBonusUntil: true } }),
    ])
    await prisma.user.update({
      where: { id: userId },
      data: { proBonusUntil: extendBonus(ich?.proBonusUntil ?? null, REFERRAL.BONUS_DAYS) },
    })
    // Der Werber bekommt seine Belohnung nur bis zur Obergrenze.
    if (werber && bisher < REFERRAL.MAX_REWARDS) {
      await prisma.user.update({
        where: { id: u.referredById },
        data: { proBonusUntil: extendBonus(werber.proBonusUntil, REFERRAL.BONUS_DAYS) },
      })
    }
    track("referral_rewarded", { userId, props: { werberBelohnt: bisher < REFERRAL.MAX_REWARDS } })
    return true
  } catch {
    return false
  }
}

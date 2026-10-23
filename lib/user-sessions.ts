import { randomBytes } from "crypto"
import prisma from "@/lib/db"

/**
 * Gleichzeitige Anmeldungen pro Konto begrenzen.
 *
 * Zwei Geräte (Handy + Laptop) sind normal; ein geteiltes Konto bedeutet
 * drei und mehr. Bei jeder neuen Anmeldung bleiben die zwei jüngsten
 * Sitzungen gültig, ältere werden beendet — die Person mit dem ältesten
 * Gerät muss sich neu anmelden und verdrängt damit wiederum jemand anderen.
 * Teilen wird lästig, ohne dass jemand ausgesperrt wird.
 *
 * Fehlertolerant: Ist die Datenbank nicht erreichbar, bleibt man angemeldet.
 */

export const MAX_SESSIONS = 2
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const TOUCH_INTERVAL_MS = 60 * 60 * 1000

/** Welche Sitzungen nach einer neuen Anmeldung beendet werden (jüngste zuerst behalten). */
export function sessionsToEvict(sessions: { id: string; lastSeenAt: Date }[], max = MAX_SESSIONS): string[] {
  return [...sessions]
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .slice(max)
    .map((s) => s.id)
}

export async function createUserSession(userId: string): Promise<string | null> {
  const sid = randomBytes(18).toString("base64url")
  try {
    await prisma.userSession.create({ data: { id: sid, userId } })
    const alle = await prisma.userSession.findMany({ where: { userId }, select: { id: true, lastSeenAt: true } })
    const weg = sessionsToEvict(alle)
    if (weg.length > 0) await prisma.userSession.deleteMany({ where: { id: { in: weg } } })
    return sid
  } catch {
    return null
  }
}

// Pro Instanz: wann zuletzt geprüft bzw. "zuletzt gesehen" geschrieben.
const geprueft = new Map<string, { at: number; aktiv: boolean; touched: number }>()

/** false nur, wenn die Sitzung sicher nicht mehr existiert. */
export async function isUserSessionActive(sid: string): Promise<boolean> {
  const jetzt = Date.now()
  const c = geprueft.get(sid)
  if (c && jetzt - c.at < CHECK_INTERVAL_MS) return c.aktiv
  try {
    const s = await prisma.userSession.findUnique({ where: { id: sid }, select: { id: true } })
    const aktiv = !!s
    let touched = c?.touched ?? 0
    if (aktiv && jetzt - touched > TOUCH_INTERVAL_MS) {
      touched = jetzt
      void prisma.userSession.update({ where: { id: sid }, data: { lastSeenAt: new Date() } }).catch(() => {})
    }
    if (geprueft.size > 5000) geprueft.clear()
    geprueft.set(sid, { at: jetzt, aktiv, touched })
    return aktiv
  } catch {
    return true
  }
}

export async function endUserSession(sid: string): Promise<void> {
  geprueft.delete(sid)
  await prisma.userSession.deleteMany({ where: { id: sid } }).catch(() => {})
}

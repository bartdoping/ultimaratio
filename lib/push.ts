import webpush from "web-push"
import prisma from "@/lib/db"

/**
 * Web-Push: Erinnerung als Benachrichtigung aufs Handy statt (nur) per Mail.
 *
 * Funktioniert in Chrome/Edge/Firefox und auf dem iPhone, sobald
 * fragenkreuzen zum Home-Bildschirm hinzugefügt wurde (iOS 16.4+).
 * Ohne VAPID-Schlüssel ist Push abgeschaltet; die Mail-Erinnerung bleibt.
 */

let konfiguriert: boolean | null = null

export function pushConfigured(): boolean {
  if (konfiguriert !== null) return konfiguriert
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:info@ultima-rat.io"
  if (!pub || !priv) return (konfiguriert = false)
  try {
    webpush.setVapidDetails(subject, pub, priv)
    konfiguriert = true
  } catch {
    konfiguriert = false
  }
  return konfiguriert
}

export type PushNachricht = { title: string; body: string; url: string; tag?: string }

/** Inhalt kurz halten — Sperrbildschirme schneiden nach ~100 Zeichen ab. */
export function pushPayload(n: PushNachricht): string {
  return JSON.stringify({ title: n.title.slice(0, 80), body: n.body.slice(0, 160), url: n.url, tag: n.tag ?? "fragenkreuzen" })
}

/**
 * Schickt eine Nachricht an alle Geräte eines Nutzers. Abgelaufene Abos
 * (404/410) werden gelöscht. Rückgabe: Anzahl erfolgreich zugestellter.
 */
export async function sendPushToUser(userId: string, n: PushNachricht): Promise<number> {
  if (!pushConfigured()) return 0
  const subs = await prisma.pushSubscription.findMany({ where: { userId } }).catch(() => [])
  let ok = 0
  const payload = pushPayload(n)
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 })
      ok++
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      }
    }
  }
  return ok
}

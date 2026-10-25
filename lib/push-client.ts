"use client"

/**
 * Web-Push im Browser: Zustimmung einholen, Abo anlegen, an den Server melden.
 * Auf dem iPhone geht Push nur, wenn fragenkreuzen zum Home-Bildschirm
 * hinzugefügt wurde — dann bleibt die Mail-Erinnerung der Weg.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

export type PushErgebnis = "an" | "abgelehnt" | "nicht_verfuegbar" | "fehler"

export function pushVerfuegbar(): boolean {
  return (
    typeof window !== "undefined" &&
    !!PUBLIC_KEY &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/** iPhone im Browser (nicht installiert): Push erst nach "Zum Home-Bildschirm". */
export function iosOhneInstallation(): boolean {
  if (typeof window === "undefined") return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
  return ios && !standalone
}

function schluessel(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registrierung(): Promise<ServiceWorkerRegistration | null> {
  const vorhanden = await navigator.serviceWorker.getRegistration()
  if (vorhanden) return vorhanden
  // Im Entwicklungsmodus gibt es bewusst keinen Service Worker (Caching stört dort).
  if (process.env.NODE_ENV !== "production") return null
  return navigator.serviceWorker.register("/sw.js")
}

export async function pushAktiv(): Promise<boolean> {
  if (!pushVerfuegbar() || Notification.permission !== "granted") return false
  const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined)
  return !!(await reg?.pushManager.getSubscription().catch(() => null))
}

/** Muss aus einem Klick heraus aufgerufen werden (Browser verlangen eine Nutzeraktion). */
export async function pushAktivieren(): Promise<PushErgebnis> {
  if (!pushVerfuegbar()) return "nicht_verfuegbar"
  try {
    const erlaubnis = await Notification.requestPermission()
    if (erlaubnis !== "granted") return "abgelehnt"
    const reg = await registrierung()
    if (!reg) return "nicht_verfuegbar"
    await navigator.serviceWorker.ready
    const abo =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: schluessel(PUBLIC_KEY) as BufferSource }))
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(abo.toJSON()),
    })
    return res.ok ? "an" : "fehler"
  } catch {
    return "fehler"
  }
}

export async function pushDeaktivieren(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined)
  const abo = await reg?.pushManager.getSubscription().catch(() => null)
  if (!abo) return
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint: abo.endpoint }),
  }).catch(() => {})
  await abo.unsubscribe().catch(() => {})
}

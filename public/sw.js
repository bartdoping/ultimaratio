/*
 * Service Worker von fragenkreuzen — bewusst zurückhaltend.
 *
 * - Seiten: immer zuerst das Netz. Nur ohne Netz kommt die zuletzt geladene
 *   Fassung (bzw. /offline). So sieht niemand veraltete Inhalte, solange er
 *   online ist.
 * - /_next/static: unveränderlich (Hash im Namen) → aus dem Cache.
 * - /api: nie angefasst. Den Fragenvorrat für Funklöcher hält die App selbst.
 * - Push: Lern-Erinnerungen (nur nach Zustimmung); Tippen öffnet die App.
 */
const VERSION = "fk-v2"
const STATIC = `${VERSION}-static`
const PAGES = `${VERSION}-pages`
const PRECACHE = ["/offline", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) c.put(req, res.clone())
        return res
      })
    )
    return
  }

  if (req.mode === "navigate") {
    // Nur die App-Seiten offline vorhalten — nicht Konto, Zahlung, Admin.
    const merken = url.pathname === "/kreuzen" || url.pathname === "/meine-fragen"
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (merken && res.ok) {
            const copy = res.clone()
            caches.open(PAGES).then((c) => c.put(url.pathname, copy))
          }
          return res
        })
        .catch(async () => {
          const c = await caches.open(PAGES)
          return (await c.match(url.pathname)) || (await c.match("/offline")) || Response.error()
        })
    )
  }
})

self.addEventListener("push", (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch (e) {
    d = { body: event.data ? event.data.text() : "" }
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "fragenkreuzen", {
      body: d.body || "Zeit für ein paar Fragen.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: d.tag || "fragenkreuzen",
      data: { url: d.url || "/kreuzen" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const ziel = new URL((event.notification.data && event.notification.data.url) || "/kreuzen", self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenster) => {
      for (const f of fenster) {
        if (new URL(f.url).origin === self.location.origin && "focus" in f) {
          f.navigate(ziel)
          return f.focus()
        }
      }
      return self.clients.openWindow(ziel)
    })
  )
})

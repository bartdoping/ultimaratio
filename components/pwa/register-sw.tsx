"use client"

import { useEffect } from "react"
import { trackClient } from "@/lib/track-client"

/** Registriert den Service Worker (nur in Produktion) und zählt Installationen. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {})
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })
    const onInstalled = () => trackClient("pwa_installed")
    window.addEventListener("appinstalled", onInstalled)
    return () => window.removeEventListener("appinstalled", onInstalled)
  }, [])
  return null
}

"use client"

import { useEffect, useId, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          theme?: "auto" | "light" | "dark"
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

type Props = {
  siteKey: string
  onVerify: (token: string | null) => void
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let scriptLoadingPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadingPromise) return scriptLoadingPromise
  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${SCRIPT_URL}"]`
    )
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.addEventListener("load", () => resolve(), { once: true })
    s.addEventListener("error", () => reject(new Error("turnstile_script_failed")), {
      once: true,
    })
    document.head.appendChild(s)
  })
  return scriptLoadingPromise
}

/**
 * Cloudflare-Turnstile-Widget. Rendert sich nur, wenn `siteKey` gesetzt ist.
 * Liefert das Token via `onVerify` zurück; null bei Reset/Expire.
 */
export function TurnstileWidget({ siteKey, onVerify }: Props) {
  const containerId = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const widgetIdRef = useRef<string | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    mountedRef.current = true

    loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        const container = document.getElementById(containerId)
        if (!container || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(null),
          "error-callback": () => onVerify(null),
        })
      })
      .catch(() => {
        // Skript konnte nicht geladen werden – wir geben null durch, die Form
        // bleibt dann disabled (oder fällt graceful zurück).
        onVerify(null)
      })

    return () => {
      cancelled = true
      mountedRef.current = false
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
        }
      } catch {
        // ignore
      }
      widgetIdRef.current = null
    }
  }, [containerId, siteKey, onVerify])

  return <div id={containerId} className="mt-1 min-h-[65px]" />
}

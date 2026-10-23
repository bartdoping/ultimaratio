"use client"

/**
 * Meldet ein Ereignis an /api/events. Bewusst ohne Rückmeldung und ohne
 * Fehler: Messung darf nie eine Nutzeraktion stören. `keepalive`, damit das
 * Ereignis auch beim Verlassen der Seite noch ankommt.
 */
export function trackClient(name: string, props?: Record<string, string | number | boolean>): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ name, props }),
    }).catch(() => {})
  } catch {
    // ignorieren
  }
}

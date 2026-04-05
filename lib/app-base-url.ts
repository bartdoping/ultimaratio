/** Basis-URL für Stripe-Redirects und absolute Links (ohne trailing slash). */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) return raw.replace(/\/$/, "")
  return "https://fragenkreuzen.de"
}

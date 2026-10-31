import { SENTRY_BASIS } from "@/lib/sentry-scrub"

// Bewusst nachgeladen: Sentry wiegt rund 65 kB und soll den ersten Seitenaufruf
// auf dem Handy nicht bremsen. Ohne DSN wird gar nichts geladen.
if (SENTRY_BASIS.dsn) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init(SENTRY_BASIS))
}

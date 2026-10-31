import * as Sentry from "@sentry/nextjs"
import { SENTRY_BASIS } from "@/lib/sentry-scrub"

Sentry.init({
  ...SENTRY_BASIS,
  // Die API-Routen fangen ihre Fehler selbst und schreiben console.error.
  // Ohne das hier sähe Sentry einen gescheiterten Webhook oder Kauf nie.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
})

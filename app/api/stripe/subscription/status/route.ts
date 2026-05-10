// Legacy-Pfad: einige Clients könnten noch /api/stripe/subscription/status aufrufen.
// Haupt-Endpoint ohne „stripe“ im Pfad: /api/subscription/status (weniger Adblocker-Probleme).
import { subscriptionStatusGET } from "@/lib/subscription-status-route"

export const runtime = "nodejs"

export const GET = subscriptionStatusGET

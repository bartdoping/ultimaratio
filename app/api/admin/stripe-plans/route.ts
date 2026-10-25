import { NextResponse } from "next/server"
import { requireAdminJson } from "@/lib/authz"
import { getStripeConfig } from "@/lib/stripe-config"
import { diagnosePlans } from "@/lib/stripe-plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/stripe-plans — warum wird ein Tarif (nicht) angeboten?
 *
 * Gibt nie Schlüssel aus: nur Modus (live/test), ob Variablen gesetzt sind,
 * die letzten Zeichen der Preis-IDs und die Fehlermeldung von Stripe.
 */
export async function GET() {
  const guard = await requireAdminJson()
  if (guard.response) return guard.response
  const cfg = getStripeConfig()
  return NextResponse.json(
    {
      schluesselModus: cfg.mode,
      webhookSecretGesetzt: !!cfg.webhookSecret,
      hinweise: cfg.issues,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      tarife: (await diagnosePlans()).map(({ angebot, ...d }) => d),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

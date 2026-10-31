import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { requireAdminJson } from "@/lib/authz"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET: Testmeldung an Sentry — zeigt, ob die Fehlerüberwachung wirklich ankommt. */
export async function GET() {
  const guard = await requireAdminJson()
  if (guard.response) return guard.response

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_SENTRY_DSN fehlt" }, { status: 503 })
  }
  const eventId = Sentry.captureException(new Error("Sentry-Test aus dem Admin-Bereich"))
  const zugestellt = await Sentry.flush(5000)
  return NextResponse.json({ ok: zugestellt, eventId })
}

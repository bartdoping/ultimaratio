import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { CLIENT_EVENTS, isProductEventName, track } from "@/lib/product-events"

export const runtime = "nodejs"

/**
 * POST /api/events — Ereignisse aus dem Browser.
 *
 * Nur eine kleine Liste erlaubter Namen (siehe CLIENT_EVENTS); alles, was mit
 * Geld, Abo oder Konto zu tun hat, meldet ausschließlich der Server — sonst
 * ließe sich die Auswertung von außen verfälschen.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; props?: unknown }
  if (!isProductEventName(body.name) || !CLIENT_EVENTS.includes(body.name)) {
    return NextResponse.json({ ok: false, error: "unknown_event" }, { status: 400 })
  }

  let userId: string | null = null
  const session = await getServerSession(authOptions).catch(() => null)
  const email = session?.user?.email?.toLowerCase().trim()
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    userId = u?.id ?? null
  }

  const props =
    body.props && typeof body.props === "object" ? (body.props as Record<string, unknown>) : undefined
  track(body.name, { userId, props })
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}

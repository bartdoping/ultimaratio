// Nach Stripe-Redirect: Session-ID verifizieren und Pro aktivieren (Fallback wenn Webhook verzögert)
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { activateProFromCheckoutSession } from "@/lib/stripe-subscription-activate"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : ""
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
    }

    const checkout = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkout.metadata?.userId !== me.id) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
    }

    const result = await activateProFromCheckoutSession(checkout)
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason },
        { status: 422 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[complete-checkout]", e)
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 })
  }
}

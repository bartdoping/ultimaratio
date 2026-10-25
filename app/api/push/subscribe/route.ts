import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { pushConfigured } from "@/lib/push"

export const runtime = "nodejs"

async function nutzerId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) return null
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  return u?.id ?? null
}

/**
 * POST — Push-Abo dieses Geräts speichern und Erinnerungen einschalten.
 * Body: { endpoint, keys: { p256dh, auth } } (PushSubscription.toJSON())
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  if (!pushConfigured()) return NextResponse.json({ ok: false, error: "push_disabled" }, { status: 503 })
  const userId = await nutzerId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : ""
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : ""
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : ""
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  })
  // Push ist eine Erinnerungsart — die Einwilligung gilt für Erinnerungen insgesamt.
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { reminderToken: true } })
  await prisma.user.update({
    where: { id: userId },
    data: {
      reminderOptIn: true,
      ...(u?.reminderToken ? {} : { reminderToken: randomBytes(24).toString("base64url") }),
    },
  })
  return NextResponse.json({ ok: true })
}

/** DELETE — Push für dieses Gerät abschalten. Body: { endpoint } */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const userId = await nutzerId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown }
  if (typeof body.endpoint === "string") {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId } })
  }
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import {
  FONT_SCALE_COOKIE,
  FONT_SCALE_DEFAULT,
  isFontScale,
} from "@/lib/font-scale"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const scale = isFontScale(body.scale) ? body.scale : FONT_SCALE_DEFAULT

  // Persistieren am Userprofil (für DB), Cookie für sofortige SSR-Wirkung.
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    try {
      await prisma.user.update({
        where: { email: session.user.email.toLowerCase().trim() },
        data: { fontScale: scale },
      })
    } catch {
      // best-effort
    }
  }

  const res = NextResponse.json({ ok: true, scale })
  res.cookies.set(FONT_SCALE_COOKIE, scale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  })
  return res
}

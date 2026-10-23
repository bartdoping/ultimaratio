import { NextResponse } from "next/server"
import { normalizeCode, REFERRAL } from "@/lib/referral"

export const runtime = "nodejs"

/**
 * /r/CODE — Einladungs- bzw. Creator-Link.
 *
 * Merkt sich den Code 30 Tage im Cookie und führt direkt in den Kreuz-Modus:
 * erst ausprobieren, dann registrieren. Ob der Code gültig ist, entscheidet
 * sich erst bei der Registrierung — hier wird nichts nachgeschlagen.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = normalizeCode(code)
  const res = NextResponse.redirect(new URL("/kreuzen?eingeladen=1", req.url))
  if (c) {
    res.cookies.set(REFERRAL.COOKIE, c, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: REFERRAL.COOKIE_MAX_AGE,
      path: "/",
    })
  }
  return res
}

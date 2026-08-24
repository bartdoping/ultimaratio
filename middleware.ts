import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { isAdminRole, isGeneratorModePathAllowed } from "@/lib/platform-access"

/**
 * Abweisung für gesperrte Pfade.
 *
 * Für Seiten ist die Weiterleitung auf /coming-soon richtig. Für API-Routen
 * wäre sie irreführend: Ein Aufruf per fetch/curl bekäme HTTP 200 mit der
 * HTML-Seite und sähe damit aus wie ein Erfolg. API-Pfade erhalten deshalb
 * eine klare JSON-Antwort mit passendem Statuscode.
 */
function abweisen(req: NextRequest, pathname: string, angemeldet: boolean) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: angemeldet ? "forbidden" : "unauthorized" },
      { status: angemeldet ? 403 : 401, headers: { "Cache-Control": "no-store" } }
    )
  }
  return NextResponse.redirect(new URL("/coming-soon", req.url))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!isAdminRole(token?.role as string | undefined)) {
      return abweisen(req, pathname, Boolean(token))
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (isAdminRole(token?.role as string | undefined)) {
    return NextResponse.next()
  }

  if (isGeneratorModePathAllowed(pathname)) {
    return NextResponse.next()
  }

  return abweisen(req, pathname, Boolean(token))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}

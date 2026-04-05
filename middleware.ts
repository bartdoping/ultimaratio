// middleware.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Coming-Soon global deaktiviert: alle Routen durchlassen.
 * Die Seite `app/coming-soon` bleibt im Projekt und ist unter `/coming-soon` weiter aufrufbar.
 */
export async function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: ["/:path*"] }

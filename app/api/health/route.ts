import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/health — für externe Uptime-Überwachung (z. B. UptimeRobot,
 * Better Stack). 200 = App und Datenbank erreichbar, 503 = Datenbank nicht.
 * Gibt keine internen Details preis.
 */
export async function GET() {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: "ok", ms: Date.now() - t0 }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ ok: false, db: "fehler" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}

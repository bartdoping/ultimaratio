import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { track } from "@/lib/product-events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

/** Speicherfristen laut Datenschutzerklärung (Abschnitt Speicherdauer). */
const AUFBEWAHRUNG = {
  /** Produktstatistik und KI-Kostenmessung: 14 Monate. */
  statistikTage: 425,
  /** Anmeldesitzungen ohne Aktivität: 30 Tage (= Lebensdauer des Login-Cookies). */
  sitzungTage: 30,
} as const

/**
 * GET /api/cron/cleanup — löscht Daten nach Ablauf ihrer Speicherfrist.
 * Geschützt über CRON_SECRET wie alle Cron-Endpunkte.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const tag = 86_400_000
  const jetzt = Date.now()
  const [events, kosten, sitzungen] = await Promise.all([
    prisma.productEvent.deleteMany({ where: { createdAt: { lt: new Date(jetzt - AUFBEWAHRUNG.statistikTage * tag) } } }),
    prisma.aiUsageEvent.deleteMany({ where: { createdAt: { lt: new Date(jetzt - AUFBEWAHRUNG.statistikTage * tag) } } }),
    prisma.userSession.deleteMany({ where: { lastSeenAt: { lt: new Date(jetzt - AUFBEWAHRUNG.sitzungTage * tag) } } }),
  ])
  track("cron_run", { props: { job: "cleanup", events: events.count, kosten: kosten.count, sitzungen: sitzungen.count } })
  return NextResponse.json({ ok: true, events: events.count, kosten: kosten.count, sitzungen: sitzungen.count })
}

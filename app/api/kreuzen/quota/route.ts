import { NextResponse } from "next/server"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import { getPoolQuota } from "@/lib/pool-quota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/kreuzen/quota — Kreuz-Kontingent für die Anzeige in der App-Leiste
 * ("18/25 Fragen heute"). Gezählt werden beantwortete Fragen.
 */
export async function GET(req: Request) {
  const access = await resolveGeneratorAccess(req)
  const q = await getPoolQuota(quotaSubjectFromAccess(access))
  return NextResponse.json(
    {
      ok: true,
      isPro: access.isPro,
      isAdmin: access.isAdmin,
      quota: q.unlimited
        ? { unlimited: true, remaining: -1, dailyLimit: -1, used: 0 }
        : { unlimited: false, remaining: q.remaining, dailyLimit: q.limit, used: q.used },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

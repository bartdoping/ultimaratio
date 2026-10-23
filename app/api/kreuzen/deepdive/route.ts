import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { resolveGeneratorAccess } from "@/lib/generator-access"
import { generateDeepDive } from "@/lib/deep-dive"
import { payloadToQuestion } from "@/lib/saved-questions"
import { withAiUser } from "@/lib/ai-usage"
import { track } from "@/lib/product-events"
import type { GeneratorSection } from "@/lib/generator-section"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/kreuzen/deepdive — Vertiefung zu einer Frage.
 *
 * Poolfragen: einmal erzeugt, für alle gespeichert — jede weitere Anfrage ist
 * kostenlos. Fragen aus "Meine Fragen" ohne Poolbezug: nur für angemeldete
 * Nutzer, Ergebnis wird im eigenen Eintrag gespeichert.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const poolQuestionId = typeof body.poolQuestionId === "string" ? body.poolQuestionId : null
  const savedId = typeof body.savedId === "string" ? body.savedId : null
  const access = await resolveGeneratorAccess(req)
  const userId = access.user?.id ?? null
  const signal = AbortSignal.timeout(55_000)

  if (poolQuestionId) {
    const pq = await prisma.poolQuestion.findUnique({ where: { id: poolQuestionId } })
    if (!pq) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
    if (pq.deepDive) return NextResponse.json({ ok: true, text: pq.deepDive, cached: true })
    const q = payloadToQuestion(pq.payload)
    if (!q) return NextResponse.json({ ok: false, error: "broken" }, { status: 500 })
    const text = await withAiUser(userId, () =>
      generateDeepDive(q, { topic: pq.topic, difficulty: pq.difficulty, section: pq.section as GeneratorSection }, signal)
    ).catch(() => null)
    if (!text) return NextResponse.json({ ok: false, error: "failed" }, { status: 502 })
    // Nur speichern, wenn noch keiner zuvorgekommen ist.
    await prisma.poolQuestion.updateMany({ where: { id: pq.id, deepDive: null }, data: { deepDive: text } })
    track("explanation_deepdive", { userId, props: { cached: false } })
    return NextResponse.json({ ok: true, text, cached: false })
  }

  if (savedId && userId) {
    const sq = await prisma.savedQuestion.findFirst({ where: { id: savedId, userId } })
    if (!sq) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
    const q = payloadToQuestion(sq.payload)
    if (!q) return NextResponse.json({ ok: false, error: "broken" }, { status: 500 })
    if (q.explanation?.trim()) return NextResponse.json({ ok: true, text: q.explanation, cached: true })
    const text = await withAiUser(userId, () =>
      generateDeepDive(q, { topic: sq.topic, difficulty: sq.difficulty, section: sq.section as GeneratorSection }, signal)
    ).catch(() => null)
    if (!text) return NextResponse.json({ ok: false, error: "failed" }, { status: 502 })
    await prisma.savedQuestion.update({
      where: { id: sq.id },
      data: { payload: { ...(sq.payload as object), explanation: text } },
    })
    track("explanation_deepdive", { userId, props: { cached: false } })
    return NextResponse.json({ ok: true, text, cached: false })
  }

  return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
}

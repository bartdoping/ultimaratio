import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import { consumePoolAnswer } from "@/lib/pool-quota"
import { recordPoolAnswer } from "@/lib/pool"
import { nextReviewState, payloadToQuestion } from "@/lib/saved-questions"
import { track } from "@/lib/product-events"
import { recordStreakActivity } from "@/lib/streak"
import { maybeRewardReferral } from "@/lib/referral"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/kreuzen/answer — eine Antwort im Kreuz-Strom erfassen.
 *
 * Body: { poolQuestionId?, savedId?, chosenText, ms? }
 *
 * Der Browser zeigt richtig/falsch sofort selbst an (die Lösung steckt in der
 * ausgelieferten Frage) — dieser Aufruf ist reine Buchführung und darf langsam
 * sein oder offline nachgereicht werden. Richtig/falsch entscheidet hier der
 * Server anhand des gewählten Texts, nicht der Browser.
 *
 * Für angemeldete Nutzer wird die Frage zugleich in "Meine Fragen" abgelegt
 * bzw. ihr Wiederholungstermin fortgeschrieben — ohne Zusatzaufwand entsteht
 * so die persönliche Wiederholung.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const chosenText = typeof body.chosenText === "string" ? body.chosenText.slice(0, 2000) : ""
  const poolQuestionId = typeof body.poolQuestionId === "string" ? body.poolQuestionId : null
  const savedId = typeof body.savedId === "string" ? body.savedId : null
  const ms = Number(body.ms) || null
  if (!chosenText || (!poolQuestionId && !savedId)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  const access = await resolveGeneratorAccess(req)
  const userId = access.user?.id ?? null

  let correct: boolean | null = null
  let thema: string | null = null
  let poolMeta: { topic: string; difficulty: number; section: string; stem: string; payload: unknown } | null = null

  if (poolQuestionId) {
    const r = await recordPoolAnswer({ poolQuestionId, chosenText, userId, msToAnswer: ms })
    if (r) {
      correct = r.correct
      // Kreuz-Kontingent: zählt beantwortete Poolfragen. Fällige Wiederholungen
      // (savedId) gehören dem Nutzer schon; geteilte Fragen (/f) zählen nicht.
      if (body.quelle === "kreuzen" && !savedId) await consumePoolAnswer(quotaSubjectFromAccess(access))
      const pq = await prisma.poolQuestion.findUnique({
        where: { id: poolQuestionId },
        select: { topic: true, difficulty: true, section: true, stem: true, payload: true },
      })
      poolMeta = pq
    }
  }

  if (userId) {
    // Bestehenden Eintrag in "Meine Fragen" finden — über die Wiederholungs-ID
    // oder über die Poolfrage.
    const vorhanden = savedId
      ? await prisma.savedQuestion.findFirst({ where: { id: savedId, userId } })
      : poolQuestionId
        ? await prisma.savedQuestion.findFirst({ where: { userId, poolQuestionId } })
        : null

    if (correct === null && vorhanden) {
      const q = payloadToQuestion(vorhanden.payload)
      const n = (t: string) => t.replace(/\s+/g, " ").trim()
      const opt = q?.options.find((o) => n(o.text) === n(chosenText))
      if (opt) correct = opt.isCorrect
    }

    thema = vorhanden?.topic ?? poolMeta?.topic ?? null
    if (correct !== null) {
      if (vorhanden) {
        const next = nextReviewState(vorhanden, correct)
        await prisma.savedQuestion.update({ where: { id: vorhanden.id }, data: next })
      } else if (poolMeta && poolQuestionId) {
        const next = nextReviewState({ attempts: 0, correctCount: 0, streak: 0 }, correct)
        await prisma.savedQuestion
          .create({
            data: {
              userId,
              poolQuestionId,
              groupId: randomUUID(),
              topic: poolMeta.topic,
              difficulty: poolMeta.difficulty,
              mode: "single",
              section: poolMeta.section,
              stem: poolMeta.stem,
              payload: poolMeta.payload as object,
              ...next,
            },
          })
          .catch(() => {
            // Gleichzeitige Doppelantwort — der Eintrag existiert bereits.
          })
      }
    }
  }

  if (correct === null) {
    return NextResponse.json({ ok: false, error: "unknown_question" }, { status: 404 })
  }
  track("question_answered", { userId, props: { correct, quelle: savedId ? "due" : "pool", ms: ms ?? 0 } })
  // Gekreuzt zählt für den Streak — nicht erst das Generieren.
  const streak = userId ? await recordStreakActivity(userId) : null
  if (userId) void maybeRewardReferral(userId)
  // Stand im Thema: wie viele der hier gekreuzten Fragen zuletzt richtig waren.
  // Sichtbarer Fortschritt pro Thema ist der stärkste Grund, "noch eine" zu kreuzen.
  let themenStand: { topic: string; sicher: number; gesamt: number } | null = null
  if (userId && thema) {
    const [gesamt, sicher] = await Promise.all([
      prisma.savedQuestion.count({ where: { userId, topic: thema, attempts: { gt: 0 } } }),
      prisma.savedQuestion.count({ where: { userId, topic: thema, lastCorrect: true } }),
    ])
    themenStand = { topic: thema, sicher, gesamt }
  }
  return NextResponse.json({ ok: true, correct, streak, themenStand }, { headers: { "Cache-Control": "no-store" } })
}

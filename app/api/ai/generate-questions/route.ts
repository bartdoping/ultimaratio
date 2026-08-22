import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import { generatorMaxOutputTokens } from "@/lib/generator-ai-config"
import { parseGenerateRequest } from "@/lib/generator-request"
import {
  buildSystemInstructions,
  buildUserPrompt,
} from "@/lib/ai-question-generator-prompt"
import {
  callGeneratorRepair,
  callGeneratorModelWithRetry,
  GeneratorModelError,
} from "@/lib/generator-openai"
import { finalizeGenerated } from "@/lib/generator-finalize"
import {
  consumeGeneratorQuota,
  refundGeneratorQuota,
  signVisitorId,
  GENERATOR_VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/generator-limits"
import { recordStreakActivity } from "@/lib/streak"
import {
  GENERATOR_MIN_INTERVAL_MS,
  rateLimitKeyFor,
  tryAcquireGeneratorSlot,
} from "@/lib/generator-rate-limit"

export const runtime = "nodejs"
// Muss über GENERATOR_TIMEOUT_MS liegen, sonst kappt die Plattform vorher.
export const maxDuration = 300

/**
 * Abbruch-Timeout. Bewusst großzügig: Gemessene Antwortzeiten von gpt-5.4
 * schwanken bei identischem Prompt zwischen 27 s und 145 s — die Streuung
 * kommt von der Auslastung der API, nicht von unserem Code. Mit 90 s wurden
 * langsame Zeitfenster fälschlich als Fehler abgebrochen, obwohl die Antwort
 * noch unterwegs war. Der Client zeigt währenddessen den Streaming-Fortschritt.
 */
const GENERATOR_TIMEOUT_MS = Number(process.env.GENERATOR_TIMEOUT_MS) || 170_000

function limitJson(
  access: Awaited<ReturnType<typeof resolveGeneratorAccess>>,
  quota: Extract<Awaited<ReturnType<typeof consumeGeneratorQuota>>, { ok: false }>,
  unitsRequested: number
) {
  return {
    ok: false as const,
    error: "daily_limit_reached",
    limitReached: true,
    upgradeRequired: !access.isPro,
    loginRequired: !access.isLoggedIn,
    isLoggedIn: access.isLoggedIn,
    isPro: access.isPro,
    used: quota.used,
    remaining: Math.max(0, quota.dailyLimit - quota.used),
    dailyLimit: quota.dailyLimit,
    requested: unitsRequested,
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY fehlt auf dem Server." }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = parseGenerateRequest(body)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }
    const { topic, difficulty, mode, caseQuestionCount, difficulties } = parsed.value
    const expectedCount = parsed.expectedCount

    const access = await resolveGeneratorAccess(req)
    const quotaSubject = quotaSubjectFromAccess(access)

    // Burst-/Rate-Limit prüfen, BEVOR Quota verbraucht wird.
    const rlKey = rateLimitKeyFor(quotaSubject)
    const rl = tryAcquireGeneratorSlot(rlKey)
    if (!rl.ok) {
      const retryAfterSec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000))
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          message: `Bitte kurz warten — eine Generierung ist nur alle ${Math.ceil(GENERATOR_MIN_INTERVAL_MS / 1000)} Sekunden möglich.`,
          retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      )
    }

    // Verbuche genau so viele Generierungen, wie tatsächlich produziert werden:
    // 1 für Einzelfragen, N für Fallfragen mit N Teilfragen.
    const quotaResult = await consumeGeneratorQuota(quotaSubject, expectedCount)

    if (!quotaResult.ok) {
      return NextResponse.json(limitJson(access, quotaResult, expectedCount), { status: 429 })
    }

    // Ab hier ist Quota verbraucht – bei jedem Fehlerpfad refund.
    let refunded = false
    const refundOnce = async () => {
      if (refunded) return
      refunded = true
      await refundGeneratorQuota(quotaSubject, expectedCount)
    }

    const promptParams = {
      topic,
      difficulty: Math.round(difficulty),
      mode,
      caseQuestionCount: mode === "case" ? caseQuestionCount : undefined,
      difficulties: mode === "case" ? difficulties : undefined,
    }

    const instructions = buildSystemInstructions()
    const userPrompt = buildUserPrompt(promptParams)
    const maxOutputTokens = generatorMaxOutputTokens(mode, expectedCount)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GENERATOR_TIMEOUT_MS)

    try {
      const callParams = {
        instructions,
        input: userPrompt,
        maxOutputTokens,
        signal: controller.signal,
      }

      let rawText: string
      try {
        rawText = await callGeneratorModelWithRetry(callParams)
      } catch (err) {
        await refundOnce()
        throw err
      }

      // Gemeinsame Validierung + konservative Repair-Pässe.
      const finalized = await finalizeGenerated({
        rawText,
        mode,
        expectedCount,
        repair: (opts) => callGeneratorRepair(callParams, opts),
      })

      if (!finalized.ok) {
        await refundOnce()
        return NextResponse.json({ ok: false, error: finalized.error }, { status: finalized.status })
      }

      const questions = finalized.questions

      // Streak nur für eingeloggte User – best-effort, niemals werfen.
      let streakInfo: Awaited<ReturnType<typeof recordStreakActivity>> = null
      if (access.user?.id) {
        try {
          streakInfo = await recordStreakActivity(access.user.id)
        } catch {
          streakInfo = null
        }
      }

      const res = NextResponse.json({
        ok: true,
        questions,
        quota: {
          used: quotaResult.used,
          remaining: quotaResult.remaining,
          dailyLimit: quotaResult.dailyLimit,
          unlimited: quotaResult.unlimited,
        },
        meta: {
          topic,
          difficulty: Math.round(difficulty),
          mode,
          caseQuestionCount: expectedCount,
          unitsCharged: expectedCount,
        },
        streak: streakInfo
          ? {
              currentStreak: streakInfo.currentStreak,
              longestStreak: streakInfo.longestStreak,
              milestoneJustReached: streakInfo.milestoneJustReached,
            }
          : null,
      })

      if (access.newVisitorId) {
        res.cookies.set(
          GENERATOR_VISITOR_COOKIE,
          signVisitorId(access.newVisitorId),
          visitorCookieOptions()
        )
      }

      return res
    } catch (e) {
      // Abort/Netzwerk/Unhandled – Refund bevor wir nach oben werfen.
      await refundOnce()
      throw e
    } finally {
      clearTimeout(timeout)
    }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; name?: string }
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { ok: false, error: "Generierung dauerte zu lange. Bitte erneut versuchen." },
        { status: 504 }
      )
    }
    if (e instanceof GeneratorModelError) {
      return NextResponse.json(
        { ok: false, error: e.message, kind: e.kind },
        { status: e.status ?? 500 }
      )
    }
    // Zugriffsfehler aus assertSameOrigin / resolveGeneratorAccess
    if (err?.status && err.status >= 400 && err.status < 500) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status })
    }
    console.error("generate-questions failed:", err?.message || err)
    return NextResponse.json({ ok: false, error: "Generierung fehlgeschlagen." }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}

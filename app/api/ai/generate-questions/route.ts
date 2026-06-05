import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import {
  generatorMaxOutputTokens,
  GENERATOR_TOPIC_MAX,
} from "@/lib/generator-ai-config"
import {
  buildSystemInstructions,
  buildUserPrompt,
} from "@/lib/ai-question-generator-prompt"
import {
  callGeneratorModel,
  callGeneratorModelWithRetry,
  GeneratorModelError,
} from "@/lib/generator-openai"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"
import {
  buildDepthRepairHint,
  checkExplanationDepth,
  questionsHaveExplanations,
  validateGeneratedQuestions,
} from "@/lib/generator-validate"
import { buildSpoilerRepairHint, detectSpoilers } from "@/lib/spoiler-detection"
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

const GENERATOR_TIMEOUT_MS = 90_000

function parseGenerateBody(body: unknown) {
  const b = body as Record<string, unknown>
  const topic = String(b?.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
  const difficulty = Number(b?.difficulty)
  const mode = b?.mode === "case" ? ("case" as const) : ("single" as const)
  const caseQuestionCount = Number(b?.caseQuestionCount)
  return { topic, difficulty, mode, caseQuestionCount }
}

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
    const { topic, difficulty, mode, caseQuestionCount } = parseGenerateBody(body)

    if (!topic || topic.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Bitte ein Thema mit mindestens 3 Zeichen angeben." },
        { status: 400 }
      )
    }
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
      return NextResponse.json(
        { ok: false, error: "Schwierigkeitsgrad muss zwischen 1 und 5 liegen." },
        { status: 400 }
      )
    }

    const expectedCount = mode === "case" ? caseQuestionCount : 1
    if (mode === "case") {
      if (!Number.isInteger(caseQuestionCount) || caseQuestionCount < 2 || caseQuestionCount > 5) {
        return NextResponse.json(
          { ok: false, error: "Bei Fallfragen sind 2 bis 5 Teilfragen erforderlich." },
          { status: 400 }
        )
      }
    }

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

      let jsonText = extractJsonFromModelText(rawText)
      let check = validateGeneratedQuestions(jsonText, mode, expectedCount)

      if (!check.ok || !questionsHaveExplanations(check.ok ? check.questions : [])) {
        const hint = !check.ok
          ? `VALIDIERUNGSFEHLER: ${check.error}`
          : "VALIDIERUNGSFEHLER: Erklärungen fehlen. Alle explanation-Felder müssen ausgefüllt sein."
        try {
          rawText = await callGeneratorModel(
            callParams,
            `${hint} Korrigiere und antworte ausschließlich mit gültigem JSON.`
          )
        } catch (err) {
          await refundOnce()
          throw err
        }
        jsonText = extractJsonFromModelText(rawText)
        check = validateGeneratedQuestions(jsonText, mode, expectedCount)
      }

      if (!check.ok) {
        await refundOnce()
        return NextResponse.json(
          { ok: false, error: `KI-Antwort ungültig: ${check.error} Bitte erneut generieren.` },
          { status: 502 }
        )
      }

      if (!questionsHaveExplanations(check.questions)) {
        await refundOnce()
        return NextResponse.json(
          { ok: false, error: "KI-Antwort unvollständig: Erklärungen fehlen. Bitte erneut generieren." },
          { status: 502 }
        )
      }

      // Tiefen-Check: knappe Erklärungen sind ein häufiger LLM-Defekt.
      // Ein gezielter Repair-Pass mit den konkreten Mängeln; bei Misserfolg
      // behalten wir das Original (keine harte Eskalation).
      {
        const depthIssues = checkExplanationDepth(check.questions)
        // mnemonic-Leere allein triggert KEINEN Repair-Pass — schlechte
        // Eselsbrücken sind schlechter als keine.
        const severe = depthIssues.filter((d) => d.kind !== "mnemonic_missing")
        if (severe.length > 0) {
          try {
            rawText = await callGeneratorModel(callParams, buildDepthRepairHint(severe))
            jsonText = extractJsonFromModelText(rawText)
            const recheck = validateGeneratedQuestions(jsonText, mode, expectedCount)
            if (recheck.ok && questionsHaveExplanations(recheck.questions)) {
              const newIssues = checkExplanationDepth(recheck.questions).filter(
                (d) => d.kind !== "mnemonic_missing"
              )
              // Repair akzeptieren, wenn er die Defizite spürbar reduziert hat.
              if (newIssues.length < severe.length) {
                check = recheck
              }
            }
          } catch {
            // Abort/Modellfehler hier nicht eskalieren.
          }
        }
      }

      // Spoiler-Check für Fallfragen (maximal ein gezielter Repair-Pass).
      if (mode === "case") {
        const hits = detectSpoilers(check.questions)
        if (hits.length > 0) {
          try {
            rawText = await callGeneratorModel(callParams, buildSpoilerRepairHint(hits))
            jsonText = extractJsonFromModelText(rawText)
            const recheck = validateGeneratedQuestions(jsonText, mode, expectedCount)
            if (
              recheck.ok &&
              questionsHaveExplanations(recheck.questions) &&
              detectSpoilers(recheck.questions).length <= hits.length / 2
            ) {
              // Repair akzeptieren, wenn er die Trefferzahl spürbar reduziert hat.
              check = recheck
            }
            // Bei Misslingen: Original-Antwort behalten, keine harte Fehler-Eskalation.
          } catch {
            // Aborts/Modellfehler hier nicht eskalieren — Original-Antwort verwenden.
          }
        }
      }

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
        questions: check.questions,
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

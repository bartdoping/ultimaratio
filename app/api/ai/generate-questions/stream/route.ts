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
  streamGeneratorModel,
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
export const dynamic = "force-dynamic"

const GENERATOR_TIMEOUT_MS = 90_000

function parseGenerateBody(body: unknown) {
  const b = body as Record<string, unknown>
  const topic = String(b?.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
  const difficulty = Number(b?.difficulty)
  const mode = b?.mode === "case" ? ("case" as const) : ("single" as const)
  const caseQuestionCount = Number(b?.caseQuestionCount)
  return { topic, difficulty, mode, caseQuestionCount }
}

function serializeVisitorCookie(value: string): string {
  const opts = visitorCookieOptions()
  const parts = [
    `${GENERATOR_VISITOR_COOKIE}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=Lax`,
  ]
  if (opts.httpOnly) parts.push("HttpOnly")
  if (opts.secure) parts.push("Secure")
  return parts.join("; ")
}

/**
 * Streaming-Variante des Generators (Server-Sent Events).
 *
 * Ablauf:
 *  - Vorprüfungen (Origin, Body, Rate-Limit, Quota) laufen synchron; Fehler
 *    kommen als klassische JSON-Antwort zurück (kein Stream).
 *  - Die eigentliche Generierung wird als SSE gestreamt:
 *      { type: "start" }
 *      { type: "delta", text }         ← viele, für die Live-Preview
 *      { type: "final", ok, questions, quota, meta, streak }
 *      { type: "error", error }
 *  - Serverseitige Validierung + konservative Repair-Pässe laufen NACH dem
 *    Stream auf dem vollständigen Text, bevor "final" gesendet wird.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 403
    return NextResponse.json({ ok: false, error: "forbidden" }, { status })
  }

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

  // Burst-/Rate-Limit vor Quota.
  const rl = tryAcquireGeneratorSlot(rateLimitKeyFor(quotaSubject))
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

  const quotaResult = await consumeGeneratorQuota(quotaSubject, expectedCount)
  if (!quotaResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "daily_limit_reached",
        limitReached: true,
        upgradeRequired: !access.isPro,
        loginRequired: !access.isLoggedIn,
        isLoggedIn: access.isLoggedIn,
        isPro: access.isPro,
        used: quotaResult.used,
        remaining: Math.max(0, quotaResult.dailyLimit - quotaResult.used),
        dailyLimit: quotaResult.dailyLimit,
        requested: expectedCount,
      },
      { status: 429 }
    )
  }

  const instructions = buildSystemInstructions()
  const userPrompt = buildUserPrompt({
    topic,
    difficulty: Math.round(difficulty),
    mode,
    caseQuestionCount: mode === "case" ? caseQuestionCount : undefined,
  })
  const maxOutputTokens = generatorMaxOutputTokens(mode, expectedCount)

  // Refund-Guard, den sowohl der Stream-Body als auch cancel() nutzt.
  let refunded = false
  const refundOnce = async () => {
    if (refunded) return
    refunded = true
    await refundGeneratorQuota(quotaSubject, expectedCount)
  }

  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), GENERATOR_TIMEOUT_MS)
  // Client-Disconnect → Generierung abbrechen.
  try {
    req.signal.addEventListener("abort", () => abort.abort())
  } catch {
    // manche Runtimes liefern kein req.signal — unkritisch
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (obj: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      const close = () => {
        if (closed) return
        closed = true
        clearTimeout(timeout)
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      send({ type: "start" })

      let full: string
      try {
        full = await streamGeneratorModel(
          { instructions, input: userPrompt, maxOutputTokens, signal: abort.signal },
          (delta) => send({ type: "delta", text: delta })
        )
      } catch (err) {
        await refundOnce()
        const msg =
          err instanceof GeneratorModelError
            ? err.message
            : (err as { name?: string })?.name === "AbortError"
              ? "Generierung dauerte zu lange oder wurde abgebrochen."
              : "Generierung fehlgeschlagen."
        send({ type: "error", error: msg })
        close()
        return
      }

      const finalized = await finalizeGenerated({
        rawText: full,
        mode,
        expectedCount,
        repair: (hint) =>
          callGeneratorModel(
            { instructions, input: userPrompt, maxOutputTokens, signal: abort.signal },
            hint
          ),
      })

      if (!finalized.ok) {
        await refundOnce()
        send({ type: "error", error: finalized.error })
        close()
        return
      }

      let streakInfo: Awaited<ReturnType<typeof recordStreakActivity>> = null
      if (access.user?.id) {
        try {
          streakInfo = await recordStreakActivity(access.user.id)
        } catch {
          streakInfo = null
        }
      }

      send({
        type: "final",
        ok: true,
        questions: finalized.questions,
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
      close()
    },
    async cancel() {
      // Client hat die Verbindung geschlossen, bevor "final" kam → refund.
      clearTimeout(timeout)
      abort.abort()
      await refundOnce()
    },
  })

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  }
  if (access.newVisitorId) {
    headers["Set-Cookie"] = serializeVisitorCookie(signVisitorId(access.newVisitorId))
  }

  return new Response(stream, { headers })
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}

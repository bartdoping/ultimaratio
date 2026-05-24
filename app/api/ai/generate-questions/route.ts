import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { requireGeneratorUser } from "@/lib/generator-access"
import {
  generatorMaxOutputTokens,
  GENERATOR_TOPIC_MAX,
} from "@/lib/generator-ai-config"
import { buildPlayableQuestionPrompt } from "@/lib/ai-question-generator-prompt"
import { callGeneratorModel, callGeneratorModelWithRetry } from "@/lib/generator-openai"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"
import { validateGeneratedQuestions } from "@/lib/generator-validate"

export const runtime = "nodejs"

function parseGenerateBody(body: unknown) {
  const b = body as Record<string, unknown>
  const topic = String(b?.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
  const difficulty = Number(b?.difficulty)
  const mode = b?.mode === "case" ? ("case" as const) : ("single" as const)
  const caseQuestionCount = Number(b?.caseQuestionCount)
  return { topic, difficulty, mode, caseQuestionCount }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)

    const access = await requireGeneratorUser()
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error, upgradeRequired: access.upgradeRequired },
        { status: access.status }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY fehlt auf dem Server." }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const { topic, difficulty, mode, caseQuestionCount } = parseGenerateBody(body)

    if (!topic) {
      return NextResponse.json({ ok: false, error: "Bitte ein Thema angeben." }, { status: 400 })
    }
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ ok: false, error: "Schwierigkeitsgrad muss zwischen 1 und 5 liegen." }, { status: 400 })
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

    const promptParams = {
      topic,
      difficulty: Math.round(difficulty),
      mode,
      caseQuestionCount: mode === "case" ? caseQuestionCount : undefined,
    }

    const prompt = buildPlayableQuestionPrompt(promptParams)
    const maxTokens = generatorMaxOutputTokens(mode, expectedCount)

    let rawText = await callGeneratorModelWithRetry(prompt, maxTokens)
    let jsonText = extractJsonFromModelText(rawText)
    let check = validateGeneratedQuestions(jsonText, mode, expectedCount)

    if (!check.ok) {
      rawText = await callGeneratorModel(
        prompt,
        maxTokens,
        `VALIDIERUNGSFEHLER: ${check.error} Korrigiere und antworte nur mit gültigem JSON.`
      )
      jsonText = extractJsonFromModelText(rawText)
      check = validateGeneratedQuestions(jsonText, mode, expectedCount)
    }

    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: `KI-Antwort ungültig: ${check.error} Bitte erneut generieren.` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      questions: check.questions,
      explanationsPending: true,
      meta: {
        topic,
        difficulty: Math.round(difficulty),
        mode,
        caseQuestionCount: expectedCount,
      },
    })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status })
    }
    console.error("generate-questions failed:", e)
    return NextResponse.json({ ok: false, error: err?.message || "Generierung fehlgeschlagen." }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}

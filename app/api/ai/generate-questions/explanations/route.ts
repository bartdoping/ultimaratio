import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { requireGeneratorUser } from "@/lib/generator-access"
import {
  generatorExplanationMaxOutputTokens,
  GENERATOR_TOPIC_MAX,
} from "@/lib/generator-ai-config"
import { buildExplanationPrompt } from "@/lib/ai-question-generator-prompt"
import { callGeneratorModelWithRetry } from "@/lib/generator-openai"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import {
  mergeQuestionExplanations,
  validateExplanationPatch,
} from "@/lib/generator-validate"

export const runtime = "nodejs"

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
    const topic = String(body?.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
    const difficulty = Number(body?.difficulty)
    const mode = body?.mode === "case" ? ("case" as const) : ("single" as const)
    const questions = body?.questions as BulkQuestion[] | undefined

    if (!topic) {
      return NextResponse.json({ ok: false, error: "Thema fehlt." }, { status: 400 })
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ ok: false, error: "Fragen fehlen." }, { status: 400 })
    }
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ ok: false, error: "Ungültiger Schwierigkeitsgrad." }, { status: 400 })
    }

    for (const q of questions) {
      if (!q?.stem || !Array.isArray(q.options) || q.options.length !== 5) {
        return NextResponse.json({ ok: false, error: "Ungültige Fragenstruktur." }, { status: 400 })
      }
    }

    const promptParams = {
      topic,
      difficulty: Math.round(difficulty),
      mode,
      caseQuestionCount: mode === "case" ? questions.length : undefined,
    }

    const questionsJson = JSON.stringify({ questions }, null, 0)
    const prompt = buildExplanationPrompt(promptParams, questionsJson)
    const maxTokens = generatorExplanationMaxOutputTokens(questions.length)

    const rawText = await callGeneratorModelWithRetry(prompt, maxTokens)
    const jsonText = extractJsonFromModelText(rawText)
    const check = validateExplanationPatch(jsonText, questions.length)

    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: `Erklärungen ungültig: ${check.error}` },
        { status: 502 }
      )
    }

    const merged = mergeQuestionExplanations(questions, check.questions)

    return NextResponse.json({
      ok: true,
      questions: merged,
    })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    console.error("generate-questions explanations failed:", e)
    return NextResponse.json(
      { ok: false, error: err?.message || "Erklärungen konnten nicht geladen werden." },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}

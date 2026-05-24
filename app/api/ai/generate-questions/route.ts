import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { isUserPro } from "@/lib/subscription"
import { buildQuestionGeneratorPrompt } from "@/lib/ai-question-generator-prompt"
import { extractJsonFromModelText, validateBulkJson } from "@/lib/question-bulk-json"

export const runtime = "nodejs"

const MODEL = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const canGenerate = user.role === "admin" || (await isUserPro(user.id))
    if (!canGenerate) {
      return NextResponse.json(
        { ok: false, error: "upgrade_required", upgradeRequired: true },
        { status: 403 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY fehlt auf dem Server." }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const topic = String(body?.topic ?? "").trim().slice(0, 50)
    const difficulty = Number(body?.difficulty)
    const mode = body?.mode === "case" ? "case" : "single"
    const caseQuestionCount = Number(body?.caseQuestionCount)

    if (!topic) {
      return NextResponse.json({ ok: false, error: "Bitte ein Thema angeben." }, { status: 400 })
    }
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ ok: false, error: "Schwierigkeitsgrad muss zwischen 1 und 5 liegen." }, { status: 400 })
    }

    if (mode === "case") {
      if (!Number.isInteger(caseQuestionCount) || caseQuestionCount < 2 || caseQuestionCount > 5) {
        return NextResponse.json(
          { ok: false, error: "Bei Fallfragen sind 2 bis 5 Teilfragen erforderlich." },
          { status: 400 }
        )
      }
    }

    const prompt = buildQuestionGeneratorPrompt({
      topic,
      difficulty: Math.round(difficulty),
      mode,
      caseQuestionCount: mode === "case" ? caseQuestionCount : undefined,
    })

    const resp = await client.responses.create({
      model: MODEL,
      input: prompt,
    })

    const rawText = resp.output_text ?? ""
    if (!rawText.trim()) {
      return NextResponse.json({ ok: false, error: "Leere Modell-Antwort." }, { status: 502 })
    }

    const jsonText = extractJsonFromModelText(rawText)
    const validated = validateBulkJson(jsonText)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: `KI-Antwort ungültig: ${validated.error}` },
        { status: 502 }
      )
    }

    const expectedCount = mode === "case" ? caseQuestionCount : 1
    if (validated.payload.questions.length !== expectedCount) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erwartet ${expectedCount} Frage(n), erhalten ${validated.payload.questions.length}. Bitte erneut generieren.`,
        },
        { status: 502 }
      )
    }

    for (const q of validated.payload.questions) {
      if (q.options.length !== 5) {
        return NextResponse.json(
          { ok: false, error: "Jede Frage muss genau 5 Antwortoptionen haben." },
          { status: 502 }
        )
      }
    }

    if (mode === "case") {
      const vignette = validated.payload.questions[0]?.caseVignette?.trim()
      if (!vignette) {
        return NextResponse.json(
          { ok: false, error: "Fallfrage ohne Falltext – bitte erneut generieren." },
          { status: 502 }
        )
      }
      const allSame = validated.payload.questions.every((q) => (q.caseVignette ?? "").trim() === vignette)
      if (!allSame) {
        return NextResponse.json(
          { ok: false, error: "Falltext der Teilfragen ist nicht einheitlich – bitte erneut generieren." },
          { status: 502 }
        )
      }
    } else if (validated.payload.questions.some((q) => q.caseVignette?.trim())) {
      return NextResponse.json(
        { ok: false, error: "Einzelfrage enthält unerwarteten Falltext – bitte erneut generieren." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      questions: validated.payload.questions,
      meta: {
        topic,
        difficulty: Math.round(difficulty),
        mode,
        caseQuestionCount: mode === "case" ? caseQuestionCount : 1,
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

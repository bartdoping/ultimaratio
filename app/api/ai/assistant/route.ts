// app/api/ai/assistant/route.ts
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { isUserPro } from "@/lib/subscription"

export const runtime = "nodejs"

// Modelle aus ENV (beide optional). Wenn nur PRIMARY gesetzt ist, wird es für beide Modi genutzt.
const MODEL_PRIMARY = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"
const MODEL_CONCISE = process.env.OPENAI_MODEL_CONCISE || MODEL_PRIMARY

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Role = "user" | "assistant" | "system"
type ChatMsg = { role: Role; content: string }
type AnswerStyle = "concise" | "detailed" | string

function buildPrompt(ctx: any, messages: ChatMsg[], answerStyle?: AnswerStyle) {
  const systemLines = [
    "Du bist ein medizinischer Tutor (IMPP, 2. Staatsexamen).",
    "Erkläre präzise, strukturiert und didaktisch; nutze Eselsbrücken und Ausschlussverfahren.",
    "SPOILER-GUARD: Nenne die korrekte Antwort NUR, wenn context.canRevealCorrect = true.",
    "Wenn canRevealCorrect = false: niemals direkt verraten, welche Option richtig ist; gib stattdessen Hinweise und Denkstützen.",
    "Beziehe dich immer auf die aktuelle Frage und deren Antwortoptionen."
  ]

  if (answerStyle === "concise") {
    systemLines.push(
      "ANTWORTMODUS: Antworte extrem knapp (max. 2–3 kurze Sätze), nur Kernpunkte, keine Einleitung, keine Wiederholung der Frage."
    )
  } else if (answerStyle === "detailed") {
    systemLines.push(
      "ANTWORTMODUS: Erkläre ausführlich in klaren Absätzen; arbeite schrittweise (Ursache → Pathophysio → Klinik → Ableitung); nutze, wo sinnvoll, kurze Listen; fasse am Ende die Kernaussage zusammen."
    )
  }

  const ctxPretty = ctx ? JSON.stringify(ctx, null, 2) : "{}"
  const history = (messages || [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n")

  return [
    `SYSTEM: ${systemLines.join(" ")}`,
    "",
    "[QUESTION_CONTEXT]",
    ctxPretty,
    "[/QUESTION_CONTEXT]",
    "",
    history ? "[CHAT]\n" + history + "\n[/CHAT]" : "",
    "",
    "ASSISTANT:"
  ].join("\n")
}

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

    const canUseAssistant = user.role === "admin" || await isUserPro(user.id)
    if (!canUseAssistant) {
      return NextResponse.json(
        { ok: false, error: "upgrade_required", upgradeRequired: true },
        { status: 403 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY fehlt auf dem Server." }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    if (JSON.stringify(body).length > 40_000) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 })
    }

    // Nachrichten säubern/typisieren
    const messages: ChatMsg[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
          .map((m: any) => ({
            role: (m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user") as Role,
            content: String(m?.content ?? "").slice(0, 4_000)
          }))
          .filter((m: ChatMsg) => m.content.trim().length > 0)
      : []

    const context = body?.context ?? null
    const answerStyle: AnswerStyle | undefined =
      body?.answerStyle === "concise" || body?.answerStyle === "detailed" ? body.answerStyle : undefined

    const prompt = buildPrompt(context, messages, answerStyle)

    // Modellwahl: kurz => MODEL_CONCISE, ausführlich => MODEL_PRIMARY
    const model = answerStyle === "concise" ? MODEL_CONCISE : MODEL_PRIMARY

    const resp = await client.responses.create({
      model,
      input: prompt, // Responses API akzeptiert hier den simplen String
      // keine temperature/max_tokens setzen (einige Modelle lehnen bestimmte Felder ab)
    })

    const text = resp.output_text ?? ""
    if (!text.trim()) {
      // Fallback: dennoch ok:false zurückgeben, damit das Widget eine klare Meldung zeigen kann
      return NextResponse.json({ ok: false, error: "Leere Modell-Antwort." }, { status: 200 })
    }

    return NextResponse.json({ ok: true, text })
  } catch (e: any) {
    if (e?.status) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: e.status })
    }
    console.error("assistant route failed:", e)
    return NextResponse.json({ ok: false, error: e?.message || "AI error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}
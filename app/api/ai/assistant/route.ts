// app/api/ai/assistant/route.ts
import { NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"

// Wie im funktionierenden Stand:
const MODEL = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type ChatMsg = { role: "user" | "assistant" | "system"; content: string }
type AnswerStyle = "concise" | "detailed"

// --- Prompt wie zuvor, nur um einen Stil-Baustein erweitert ---
function buildPrompt(ctx: any, messages: ChatMsg[], style: AnswerStyle) {
  const styleHint =
    style === "concise"
      ? [
          "ANTWORTSTIL: KURZ und prägnant.",
          "Maximal 3–5 Sätze ODER bis zu 5 Bulletpoints.",
          "Kein Vorspann, keine Wiederholung der Frage, keine Labels.",
        ].join(" ")
      : [
          "ANTWORTSTIL: AUSFÜHRLICH und didaktisch.",
          "Erkläre Schritt-für-Schritt; nutze bei Bedarf kurze Überschriften/Bullets.",
          "Zeige typische Fallen, Merkhilfen und ein sinnvolles Ausschlussverfahren.",
        ].join(" ")

  const system = [
    "Du bist ein medizinischer Tutor (IMPP, 2. Staatsexamen).",
    "Sprache: Deutsch.",
    "Erkläre präzise, strukturiert und didaktisch; nutze Eselsbrücken und Ausschlussverfahren.",
    "SPOILER-GUARD: Nenne die korrekte Antwort NUR, wenn context.canRevealCorrect = true.",
    "Wenn canRevealCorrect = false: nie direkt verraten, welche Option richtig ist; gib stattdessen Hinweise/Denkstützen.",
    "Beziehe dich immer auf die aktuelle Frage und deren Antwortoptionen.",
    styleHint,
  ].join(" ")

  const ctxPretty = ctx ? JSON.stringify(ctx, null, 2) : "{}"

  const history = (messages || [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n")

  return [
    `SYSTEM: ${system}`,
    "",
    "[QUESTION_CONTEXT]",
    ctxPretty,
    "[/QUESTION_CONTEXT]",
    "",
    history ? "[CHAT]\n" + history + "\n[/CHAT]" : "",
    "",
    "ASSISTANT:",
  ].join("\n")
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY fehlt auf dem Server." },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({}))

    const messages: ChatMsg[] = Array.isArray(body?.messages)
      ? body.messages
          .map((m: any) => ({
            role: (m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user") as ChatMsg["role"],
            content: String(m?.content ?? ""),
          }))
          .filter((m: ChatMsg) => m.content.trim().length > 0)
      : []

    const context = body?.context ?? null
    const answerStyle: AnswerStyle =
      body?.answerStyle === "detailed" ? "detailed" : "concise" // default: kurz

    const prompt = buildPrompt(context, messages, answerStyle)

    // Keine Zusatz-Parameter → bleibt maximal kompatibel/stabil
    const resp = await client.responses.create({
      model: MODEL,
      input: prompt,
    })

    const text = resp.output_text?.trim() ?? ""
    return NextResponse.json({ ok: true, text })
  } catch (e: any) {
    console.error("assistant route failed:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "AI error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/ai/assistant" })
}
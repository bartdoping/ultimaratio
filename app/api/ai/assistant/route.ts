// app/api/ai/assistant/route.ts
import { NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic" // stellt sicher, dass nichts statisch gebundled wird

type ChatMsg = { role: "user" | "assistant" | "system"; content: string }

// --- OpenAI-Client lazy erstellen & global cachen ---
function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const g = globalThis as any
  if (!g.__openai_client__) {
    g.__openai_client__ = new OpenAI({ apiKey: key })
  }
  return g.__openai_client__ as OpenAI
}

// Baut einen simplen, robusten Prompt-String
function buildPrompt(ctx: any, messages: ChatMsg[]) {
  const system = [
    "Du bist ein medizinischer Tutor (IMPP, 2. Staatsexamen).",
    "Erkläre präzise, strukturiert und didaktisch; nutze Eselsbrücken und Ausschlussverfahren.",
    "SPOILER-GUARD: Nenne die korrekte Antwort NUR, wenn context.canRevealCorrect = true.",
    "Wenn canRevealCorrect = false: niemals direkt verraten, welche Option richtig ist; gib stattdessen Hinweise und Denkstützen.",
    "Beziehe dich immer auf die aktuelle Frage und deren Antwortoptionen."
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
    "ASSISTANT:"
  ].join("\n")
}

export async function POST(req: Request) {
  try {
    const client = getOpenAI()
    if (!client) {
      // Wichtig: NICHT beim Import crashen – nur hier sauber 500 zurückgeben
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY fehlt auf dem Server (Vercel: Project → Settings → Environment Variables)." },
        { status: 500 }
      )
    }

    // Modell wie in deiner funktionierenden Version
    const MODEL = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"

    const body = await req.json().catch(() => ({}))
    const messages: ChatMsg[] = Array.isArray(body?.messages)
      ? body.messages
          .map((m: any) => ({
            role: (m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user") as ChatMsg["role"],
            content: String(m?.content ?? "")
          }))
          .filter((m: ChatMsg) => m.content.trim().length > 0)
      : []

    const context = body?.context ?? null

    const prompt = buildPrompt(context, messages)

    const resp = await client.responses.create({
      model: MODEL,
      // String statt strukturierter "input"
      input: prompt,
      // keine zusätzlichen Parameter, damit es mit gpt-5 stabil bleibt
    })

    const text = resp.output_text ?? ""
    return NextResponse.json({ ok: true, text })
  } catch (e: any) {
    console.error("assistant route failed:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "AI error" },
      { status: 500 }
    )
  }
}

// Healthcheck
export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"
  return NextResponse.json({ ok: true, route: "/api/ai/assistant", hasKey, model })
}
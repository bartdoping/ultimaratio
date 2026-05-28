import OpenAI from "openai"
import { GENERATOR_MODEL } from "@/lib/generator-ai-config"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type GeneratorCallParams = {
  instructions: string
  input: string
  maxOutputTokens: number
  signal?: AbortSignal
}

/**
 * Erkennt typische OpenAI-Fehler und übersetzt sie in eine kompakte,
 * deutschsprachige Fehlerklasse, die die API-Route in eine 5xx-Antwort
 * mit klarem Frontend-Text wandeln kann.
 */
export class GeneratorModelError extends Error {
  readonly kind: "invalid_model" | "auth" | "rate_limited" | "server" | "unknown"
  readonly status?: number
  constructor(message: string, kind: GeneratorModelError["kind"], status?: number) {
    super(message)
    this.name = "GeneratorModelError"
    this.kind = kind
    this.status = status
  }
}

function classifyOpenAIError(err: unknown): GeneratorModelError {
  const e = err as { status?: number; message?: string; code?: string }
  const status = typeof e?.status === "number" ? e.status : undefined
  const msg = (e?.message || "").toLowerCase()

  // Modell unbekannt / nicht verfügbar
  if (
    status === 404 ||
    msg.includes("model_not_found") ||
    msg.includes("does not exist") ||
    msg.includes("invalid model")
  ) {
    return new GeneratorModelError(
      `Konfiguriertes KI-Modell "${GENERATOR_MODEL}" ist nicht verfügbar.`,
      "invalid_model",
      status ?? 500
    )
  }

  if (status === 401 || status === 403 || msg.includes("invalid api key")) {
    return new GeneratorModelError(
      "KI-Authentifizierung fehlgeschlagen.",
      "auth",
      status ?? 500
    )
  }

  if (status === 429 || msg.includes("rate limit")) {
    return new GeneratorModelError(
      "KI-API ist derzeit ausgelastet. Bitte gleich erneut versuchen.",
      "rate_limited",
      503
    )
  }

  if (status && status >= 500) {
    return new GeneratorModelError(
      "KI-Dienst antwortet aktuell mit einem Serverfehler.",
      "server",
      503
    )
  }

  return new GeneratorModelError(
    e?.message || "Generierung fehlgeschlagen.",
    "unknown",
    status ?? 500
  )
}

async function createResponse(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  const input = repairHint ? `${params.input}\n\n${repairHint}` : params.input

  let resp
  try {
    resp = await client.responses.create(
      {
        model: GENERATOR_MODEL,
        instructions: params.instructions,
        input,
        max_output_tokens: params.maxOutputTokens,
        // `json_object` reicht in Kombination mit der serverseitigen
        // Validierung (`lib/generator-validate.ts`) plus Repair-Pass.
        // `json_schema` mit strict:true ist aktuell nicht aktiviert, weil
        // die bestehenden Felder (caseVignette, learningObjective, examTrap)
        // nullable / optional sind und strict alle Felder als required
        // verlangt — Migration wäre ein größerer, riskanter Eingriff.
        text: { format: { type: "json_object" }, verbosity: "medium" },
      },
      params.signal ? { signal: params.signal } : undefined
    )
  } catch (err) {
    // Abort einfach durchreichen — Route übersetzt es in 504.
    if ((err as { name?: string })?.name === "AbortError") throw err
    throw classifyOpenAIError(err)
  }

  const text = resp.output_text ?? ""
  if (!text.trim()) {
    throw new GeneratorModelError("Leere Modell-Antwort.", "unknown", 502)
  }
  return text
}

export async function callGeneratorModel(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  return createResponse(params, repairHint)
}

export async function callGeneratorModelWithRetry(
  params: GeneratorCallParams
): Promise<string> {
  try {
    return await createResponse(params)
  } catch (firstError) {
    // Aborts/Timeouts nicht erneut versuchen.
    if (params.signal?.aborted) throw firstError
    // Bei harten Modell-/Auth-Fehlern macht ein zweiter Versuch keinen Sinn.
    if (
      firstError instanceof GeneratorModelError &&
      (firstError.kind === "invalid_model" || firstError.kind === "auth")
    ) {
      throw firstError
    }
    try {
      return await createResponse(
        params,
        "Die vorherige Antwort war ungültig oder leer. Antworte ausschließlich mit gültigem JSON ohne Markdown und ohne zusätzlichen Text."
      )
    } catch {
      throw firstError
    }
  }
}

export function parseModelJson(rawText: string): unknown {
  const jsonText = extractJsonFromModelText(rawText)
  return JSON.parse(jsonText)
}

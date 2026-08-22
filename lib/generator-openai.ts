import OpenAI from "openai"
import {
  GENERATOR_MODEL,
  GENERATOR_MODEL_FALLBACK,
  generatorReasoningEffort,
  generatorVerbosity,
  isReasoningModel,
} from "@/lib/generator-ai-config"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type GeneratorCallParams = {
  instructions: string
  input: string
  maxOutputTokens: number
  signal?: AbortSignal
}

/**
 * Baut den Request-Body für die Responses-API. Für Reasoning-Modelle
 * (GPT-5-Familie / o-Serie) wird ein niedriger Reasoning-Effort gesetzt — das
 * ist der wichtigste Latenzhebel, weil diese Modelle sonst bei komplexen
 * Prompts lange "nachdenken". Für Nicht-Reasoning-Modelle bleibt der Body
 * schlank (kein verbosity/reasoning, das dort Fehler werfen könnte).
 */
function buildRequestBody(
  model: string,
  params: GeneratorCallParams,
  repairHint?: string
): OpenAI.Responses.ResponseCreateParamsNonStreaming {
  const input = repairHint ? `${params.input}\n\n${repairHint}` : params.input
  const reasoning = isReasoningModel(model)

  const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model,
    instructions: params.instructions,
    input,
    max_output_tokens: params.maxOutputTokens,
    text: reasoning
      ? { format: { type: "json_object" }, verbosity: generatorVerbosity() }
      : { format: { type: "json_object" } },
  }

  if (reasoning) {
    // Cast nötig: Die Typen des openai-SDK (5.16) kennen "none" und "xhigh"
    // noch nicht, die Responses-API von gpt-5.4 akzeptiert sie aber
    // (bestätigt durch die Fehlermeldung des Servers, der genau diese Werte
    // als zulässig auflistet). `generatorReasoningEffort()` validiert bereits.
    body.reasoning = {
      effort: generatorReasoningEffort() as unknown as NonNullable<
        NonNullable<OpenAI.Responses.ResponseCreateParamsNonStreaming["reasoning"]>["effort"]
      >,
    }
  }

  return body
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

async function createResponseWithModel(
  model: string,
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  let resp
  try {
    resp = await client.responses.create(
      buildRequestBody(model, params, repairHint),
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

/**
 * Streamt die Generierung. `onDelta` erhält Text-Deltas, sobald sie eintreffen
 * (für die Live-Preview im Client). Rückgabe ist der vollständige Text nach
 * Stream-Ende — die serverseitige Validierung passiert unverändert darauf.
 *
 * Wirft dieselben GeneratorModelError-Typen wie der Non-Streaming-Pfad.
 */
export async function streamGeneratorModel(
  params: GeneratorCallParams,
  onDelta: (text: string) => void
): Promise<string> {
  let full = ""
  try {
    const stream = await client.responses.create(
      { ...buildRequestBody(GENERATOR_MODEL, params), stream: true },
      params.signal ? { signal: params.signal } : undefined
    )

    for await (const event of stream) {
      // Text-Deltas der Antwort weiterreichen.
      if (event.type === "response.output_text.delta") {
        const delta = (event as { delta?: string }).delta ?? ""
        if (delta) {
          full += delta
          onDelta(delta)
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err
    throw classifyOpenAIError(err)
  }

  if (!full.trim()) {
    throw new GeneratorModelError("Leere Modell-Antwort.", "unknown", 502)
  }
  return full
}

async function createResponse(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  return createResponseWithModel(GENERATOR_MODEL, params, repairHint)
}

export async function callGeneratorModel(
  params: GeneratorCallParams,
  repairHint?: string
): Promise<string> {
  return createResponse(params, repairHint)
}

/**
 * Chirurgischer Repair-Aufruf.
 *
 * WICHTIG — das war lange ein Konstruktionsfehler: Früher wurde für einen
 * Repair einfach der ursprüngliche User-Prompt plus ein Hinweis erneut
 * gesendet. Das Modell sah seine eigene vorherige Antwort NICHT und erzeugte
 * daher jedes Mal eine **komplett neue Frage**. Folgen: die fertige Frage wich
 * von der zuvor gestreamten ab, die erste Generierung war vollständig
 * verschwendet, und jede Reparatur kostete einen weiteren vollen Roundtrip.
 *
 * Jetzt bekommt das Modell seine vorherige Antwort als Kontext und darf
 * ausschließlich die beanstandeten Felder überarbeiten. Stem, Vignette und
 * Antwortoptionen bleiben identisch — die Frage behält also ihre Identität.
 */
export async function callGeneratorRepair(
  params: GeneratorCallParams,
  opts: { hint: string; previousJson: string }
): Promise<string> {
  const repairInput = [
    "ÜBERARBEITUNG EINER BEREITS ERZEUGTEN FRAGE",
    "",
    "Unten steht die JSON-Antwort, die du soeben erzeugt hast. Sie weist die",
    "aufgeführten Mängel auf.",
    "",
    "AUFGABE: Gib GENAU DIESE Frage erneut aus und behebe ausschließlich die",
    "genannten Mängel.",
    "",
    "ZWINGEND UNVERÄNDERT übernehmen (Zeichen für Zeichen):",
    '  - "stem" jeder Frage',
    '  - "caseVignette"',
    '  - jeder "options[].text"',
    '  - jeder "options[].isCorrect"',
    "",
    "Du erfindest KEINE neue Frage, KEIN neues Thema und KEINE neuen",
    "Antwortoptionen. Verändert werden ausschließlich die beanstandeten",
    "Erklärungs- und Zusatztexte.",
    "",
    "DEINE BISHERIGE ANTWORT:",
    opts.previousJson,
    "",
    "ZU BEHEBEN:",
    opts.hint,
    "",
    "Antworte ausschließlich mit dem vollständigen, korrigierten JSON-Objekt.",
  ].join("\n")

  // Der ursprüngliche User-Prompt entfällt bewusst: Der Repair-Kontext ist
  // vollständig und kürzer, die System-Instructions bleiben erhalten.
  return createResponseWithModel(GENERATOR_MODEL, { ...params, input: repairInput })
}

export async function callGeneratorModelWithRetry(
  params: GeneratorCallParams
): Promise<string> {
  try {
    return await createResponse(params)
  } catch (firstError) {
    // Aborts/Timeouts nicht erneut versuchen.
    if (params.signal?.aborted) throw firstError

    // Auth-Fehler sind hart — kein Retry und kein Fallback-Modell.
    if (
      firstError instanceof GeneratorModelError &&
      firstError.kind === "auth"
    ) {
      throw firstError
    }

    // 1) Same-Model-Retry mit Repair-Hint (kostengünstig).
    if (
      !(firstError instanceof GeneratorModelError) ||
      firstError.kind !== "invalid_model"
    ) {
      try {
        return await createResponse(
          params,
          "Die vorherige Antwort war ungültig oder leer. Antworte ausschließlich mit gültigem JSON ohne Markdown und ohne zusätzlichen Text."
        )
      } catch (secondError) {
        if (params.signal?.aborted) throw secondError
        // Fall durch zum Modell-Fallback unten.
      }
    }

    // 2) Modell-Fallback: anderes (robusteres) Modell.
    if (GENERATOR_MODEL_FALLBACK && GENERATOR_MODEL_FALLBACK !== GENERATOR_MODEL) {
      try {
        console.warn(
          `[generator] primary model ${GENERATOR_MODEL} failed (${
            firstError instanceof Error ? firstError.message : "unknown"
          }) — falling back to ${GENERATOR_MODEL_FALLBACK}.`
        )
        return await createResponseWithModel(GENERATOR_MODEL_FALLBACK, params)
      } catch {
        // Beim Fallback-Fehler werfen wir den ursprünglichen Fehler weiter.
      }
    }

    throw firstError
  }
}

export function parseModelJson(rawText: string): unknown {
  const jsonText = extractJsonFromModelText(rawText)
  return JSON.parse(jsonText)
}

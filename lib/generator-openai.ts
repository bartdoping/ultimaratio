import OpenAI from "openai"
import { EXCLUSION_INSTRUCTIONS } from "@/lib/option-exclusion-check"
import {
  GENERATOR_MODEL,
  GENERATOR_MODEL_FALLBACK,
  generatorReasoningEffort,
  generatorVerbosity,
  isReasoningModel,
} from "@/lib/generator-ai-config"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"
import { MEDICAL_REVIEW_INSTRUCTIONS } from "@/lib/generator-medical-review"
import { recordAiUsage, type AiPurpose } from "@/lib/ai-usage"
import { sendOpsAlert } from "@/lib/ops-alert"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type GeneratorCallParams = {
  instructions: string
  input: string
  maxOutputTokens: number
  signal?: AbortSignal
  /** Wofür der Aufruf ist — für die Kostenauswertung (lib/ai-usage.ts). */
  purpose?: AiPurpose
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
  readonly kind: "invalid_model" | "auth" | "quota" | "rate_limited" | "server" | "unknown"
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
    sendOpsAlert("openai_auth", e?.message)
    return new GeneratorModelError(
      "KI-Authentifizierung fehlgeschlagen.",
      "auth",
      status ?? 500
    )
  }

  // Guthaben erschöpft — sieht aus wie ein Rate-Limit (ebenfalls HTTP 429),
  // ist aber keines: Warten und Wiederholen hilft nicht, ein Ersatzmodell in
  // derselben Organisation auch nicht. Früher landete das als "ausgelastet,
  // bitte gleich erneut versuchen" beim Nutzer und löste Wiederholungen aus.
  if (
    e?.code === "insufficient_quota" ||
    msg.includes("insufficient_quota") ||
    msg.includes("no credits") ||
    msg.includes("exceeded your current quota")
  ) {
    console.error(
      "[generator] OpenAI-Guthaben erschöpft — alle KI-Funktionen fallen aus, bis unter platform.openai.com → Billing nachgeladen wird."
    )
    sendOpsAlert("openai_quota", e?.message)
    return new GeneratorModelError(
      "Der KI-Dienst ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.",
      "quota",
      503
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
  const t0 = Date.now()
  const purpose = params.purpose ?? (repairHint ? "repair" : "other")
  try {
    resp = await client.responses.create(
      buildRequestBody(model, params, repairHint),
      params.signal ? { signal: params.signal } : undefined
    )
  } catch (err) {
    recordAiUsage({ purpose, model, usage: null, durationMs: Date.now() - t0, ok: false })
    // Abort einfach durchreichen — Route übersetzt es in 504.
    if ((err as { name?: string })?.name === "AbortError") throw err
    throw classifyOpenAIError(err)
  }
  recordAiUsage({ purpose, model, usage: resp.usage, durationMs: Date.now() - t0, ok: true })

  const text = resp.output_text ?? ""
  if (!text.trim()) {
    throw new GeneratorModelError("Leere Modell-Antwort.", "unknown", 502)
  }
  return text
}

/**
 * Ruft den unabhängigen Facharzt-Gegencheck auf.
 *
 * Bewusst mit EIGENEN Instructions statt der Generator-Instructions: Der
 * Gutachter soll die Frage unvoreingenommen prüfen und nicht die Denkweise
 * übernehmen, die sie erzeugt hat. Kleines Token-Budget, weil nur ein knappes
 * JSON-Urteil zurückkommt.
 */
export async function callMedicalReviewer(
  input: string,
  signal?: AbortSignal
): Promise<string> {
  const params: GeneratorCallParams = {
    instructions: MEDICAL_REVIEW_INSTRUCTIONS,
    input,
    maxOutputTokens: 1200,
    signal,
    purpose: "review",
  }
  return createResponseWithModel(GENERATOR_MODEL, params)
}

/**
 * Ausschluss-Check: Ein unabhängiger Leser sieht NUR die Antwortoptionen und
 * nennt, was sich ohne Fachwissen streichen lässt (siehe
 * lib/option-exclusion-check.ts). Kleines Budget, kein Reasoning — die
 * Aufgabe ist Lesen, nicht Herleiten, und sie läuft parallel zum fachlichen
 * Gegencheck, verlängert die Wartezeit also nicht.
 */
export async function callOptionExclusionCheck(
  input: string,
  signal?: AbortSignal
): Promise<string> {
  const params: GeneratorCallParams = {
    instructions: EXCLUSION_INSTRUCTIONS,
    input,
    maxOutputTokens: 600,
    signal,
    purpose: "exclusion",
  }
  return createResponseWithModel(GENERATOR_MODEL, params)
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
  const t0 = Date.now()
  const purpose = params.purpose ?? "draft"
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
      } else if (event.type === "response.completed") {
        const usage = (event as { response?: { usage?: Parameters<typeof recordAiUsage>[0]["usage"] } }).response?.usage
        recordAiUsage({ purpose, model: GENERATOR_MODEL, usage, durationMs: Date.now() - t0, ok: true })
      }
    }
  } catch (err) {
    recordAiUsage({ purpose, model: GENERATOR_MODEL, usage: null, durationMs: Date.now() - t0, ok: false })
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
/**
 * Was eine Nachbesserung ändern darf.
 *
 *  - "explanations": Die Frage ist bereits sichtbar. Stem, Falltext,
 *    Optionen und die Markierung der richtigen Antwort sind unantastbar;
 *    nur Erklärungs- und Zusatztexte dürfen sich ändern.
 *  - "options": Die Frage ist noch NICHT sichtbar. Die Optionstexte dürfen
 *    umformuliert und unplausible Distraktoren ersetzt werden — Stem,
 *    Reihenfolge, Markierung und die Aussage der richtigen Option nicht.
 *    Für formale Lösungshinweise (siehe lib/option-cues.ts).
 *  - "draft": Die Frage ist noch NICHT sichtbar und hat einen inhaltlichen
 *    Mangel (fachlicher Fehler, Spoiler, ungültige Struktur). Stem, Optionen
 *    und Markierung dürfen geändert werden, soweit die Mängelliste es verlangt.
 *
 * Früher gab es nur den ersten Rahmen — auch in der Entwurfsstufe. Damit
 * bekam das Modell bei einem fachlichen Befund widersprüchliche Anweisungen:
 * Der Hinweis verlangte, die richtige Antwort umzumarkieren, der Rahmen
 * verbot genau das.
 */
export type RepairScope = "explanations" | "options" | "draft"

function repairFrame(scope: RepairScope): string[] {
  if (scope === "options") {
    return [
      "Die Frage ist noch nicht veröffentlicht.",
      "",
      "ZWINGEND UNVERÄNDERT übernehmen:",
      '  - "stem" und "caseVignette" (Zeichen für Zeichen)',
      "  - die Reihenfolge der Antwortoptionen",
      '  - jeder "options[].isCorrect"',
      "  - die fachliche AUSSAGE der richtigen Option (nur ihre Formulierung darf sich ändern)",
      "",
      "ERLAUBT und GEFORDERT: die Formulierung der Antwortoptionen so anzugleichen,",
      "dass keine Option durch Form auffällt; unplausible Distraktoren durch",
      "plausible zu ersetzen. Alle übrigen Felder bleiben unverändert.",
    ]
  }
  if (scope === "draft") {
    return [
      "Die Frage ist noch nicht veröffentlicht.",
      "",
      "Behebe die genannten Mängel. Dafür darfst du Stem, Antwortoptionen und die",
      "Markierung der richtigen Antwort ändern — aber NUR soweit die Mängelliste",
      "es verlangt. Thema, Schwierigkeitsgrad, Modus und die Anzahl der Fragen",
      "bzw. Teilfragen bleiben gleich. Keine neue Frage zu einem anderen Aspekt.",
    ]
  }
  return [
    "ZWINGEND UNVERÄNDERT übernehmen (Zeichen für Zeichen):",
    '  - "stem" jeder Frage',
    '  - "caseVignette"',
    '  - jeder "options[].text"',
    '  - jeder "options[].isCorrect"',
    "",
    "Du erfindest KEINE neue Frage, KEIN neues Thema und KEINE neuen",
    "Antwortoptionen. Verändert werden ausschließlich die beanstandeten",
    "Erklärungs- und Zusatztexte.",
  ]
}

export async function callGeneratorRepair(
  params: GeneratorCallParams,
  opts: { hint: string; previousJson: string; scope?: RepairScope }
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
    ...repairFrame(opts.scope ?? "explanations"),
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
  return createResponseWithModel(GENERATOR_MODEL, { ...params, input: repairInput, purpose: "repair" })
}

export async function callGeneratorModelWithRetry(
  params: GeneratorCallParams
): Promise<string> {
  try {
    return await createResponse(params)
  } catch (firstError) {
    // Aborts/Timeouts nicht erneut versuchen.
    if (params.signal?.aborted) throw firstError

    // Auth-Fehler und fehlendes Guthaben sind hart — kein Retry und kein
    // Fallback-Modell. Beides würde nur weitere, garantiert scheiternde
    // Aufrufe erzeugen.
    if (
      firstError instanceof GeneratorModelError &&
      (firstError.kind === "auth" || firstError.kind === "quota")
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

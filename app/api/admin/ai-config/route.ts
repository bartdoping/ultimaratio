import { NextResponse } from "next/server"
import { requireAdminJson } from "@/lib/authz"
import {
  GENERATOR_MODEL,
  GENERATOR_MODEL_FALLBACK,
  generatorMaxOutputTokens,
  generatorReasoningEffort,
  generatorVerbosity,
  isReasoningModel,
} from "@/lib/generator-ai-config"
import { medicalReviewEnabled } from "@/lib/generator-medical-review"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/ai-config — meldet die zur LAUFZEIT aufgelöste KI-Konfiguration.
 *
 * Zweck: Nach einem Deploy zweifelsfrei feststellen, welches Modell und welche
 * Parameter tatsächlich greifen — statt es aus Env-Listen zu rekonstruieren
 * oder aus der Antwortdauer zu erraten.
 *
 * SICHERHEIT: Es werden ausschließlich Modellnamen, Parameter und
 * Vorhandensein-Flags ausgegeben. Niemals Schlüsselwerte. Für `OPENAI_API_KEY`
 * gibt es lediglich `gesetzt: true/false` und die Länge — genug, um einen
 * leeren oder abgeschnittenen Wert zu erkennen, ohne das Geheimnis preiszugeben.
 */
export async function GET() {
  const guard = await requireAdminJson()
  if (guard.response) return guard.response

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ""
  const reasoning = isReasoningModel(GENERATOR_MODEL)

  // Welche Env-Variablen sind tatsächlich gesetzt? Zeigt, ob ein Wert aus der
  // Umgebung stammt oder ob der Code-Default greift.
  const envGesetzt = (name: string) => {
    const v = process.env[name]
    return typeof v === "string" && v.trim().length > 0
  }

  const assistentPrimaer = process.env.OPENAI_MODEL_PRIMARY?.trim() || "gpt-5"
  const assistentKurz = process.env.OPENAI_MODEL_CONCISE?.trim() || assistentPrimaer

  return NextResponse.json(
    {
      ok: true,
      umgebung: {
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        aufVercel: envGesetzt("VERCEL"),
      },
      openaiSchluessel: {
        gesetzt: apiKey.length > 0,
        laenge: apiKey.length,
      },
      generator: {
        modell: GENERATOR_MODEL,
        modellAusEnv: envGesetzt("OPENAI_MODEL_GENERATOR"),
        fallbackModell: GENERATOR_MODEL_FALLBACK,
        fallbackAusEnv: envGesetzt("OPENAI_MODEL_GENERATOR_FALLBACK"),
        alsReasoningModellBehandelt: reasoning,
        // reasoning/verbosity werden nur an Reasoning-Modelle gesendet.
        reasoningEffort: reasoning ? generatorReasoningEffort() : null,
        reasoningEffortAusEnv: envGesetzt("OPENAI_GENERATOR_REASONING_EFFORT"),
        verbosity: reasoning ? generatorVerbosity() : null,
        maxOutputTokens: {
          einzelfrage: generatorMaxOutputTokens("single", 1),
          fallfrage3: generatorMaxOutputTokens("case", 3),
          fallfrage5: generatorMaxOutputTokens("case", 5),
        },
        timeoutMs: Number(process.env.GENERATOR_TIMEOUT_MS) || 170_000,
        fachlicherGegencheck: medicalReviewEnabled(),
      },
      assistent: {
        modellAusfuehrlich: assistentPrimaer,
        modellKurz: assistentKurz,
        primaerAusEnv: envGesetzt("OPENAI_MODEL_PRIMARY"),
        kurzAusEnv: envGesetzt("OPENAI_MODEL_CONCISE"),
      },
      hinweis:
        "Werte stammen aus der laufenden Instanz. 'AusEnv: false' bedeutet, dass der Code-Default greift.",
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

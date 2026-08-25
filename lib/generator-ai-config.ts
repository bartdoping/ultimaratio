export const GENERATOR_TOPIC_MAX = 150

/**
 * Generator-Modell.
 *
 * Standard ist `gpt-4o-mini` — ein sicher verfügbares, kostengünstiges
 * OpenAI-Responses-API-Modell. Über `OPENAI_MODEL_GENERATOR` lässt sich
 * jederzeit ein anderes Modell setzen (z. B. `gpt-4o`, `gpt-4.1`, ein neueres
 * Generationen-Modell), ohne dass der Code geändert werden muss.
 *
 * Wichtig: Falls hier ein nicht existierendes Modell konfiguriert wird,
 * schlägt die Generierung mit einem klaren Fehler aus der API fehl
 * (siehe `lib/generator-openai.ts`, dort wird der Fehler in eine
 * nutzerfreundliche Server-Antwort übersetzt).
 */
const FALLBACK_MODEL = "gpt-4o-mini"

export const GENERATOR_MODEL = (
  process.env.OPENAI_MODEL_GENERATOR?.trim() || FALLBACK_MODEL
)

/**
 * Sekundärmodell, das verwendet wird, wenn das primäre Modell ausfällt
 * (z. B. Timeout, 5xx, Rate-Limit nach Retry). Über
 * `OPENAI_MODEL_GENERATOR_FALLBACK` konfigurierbar.
 *
 * Default ist bewusst `gpt-4o-mini` — robust verfügbar und niemals derselbe wie
 * das Primärmodell, wenn das Primärmodell überschrieben wurde.
 */
const FALLBACK_SECONDARY = "gpt-4o-mini"
const FALLBACK_CONFIGURED =
  process.env.OPENAI_MODEL_GENERATOR_FALLBACK?.trim() || FALLBACK_SECONDARY

export const GENERATOR_MODEL_FALLBACK =
  FALLBACK_CONFIGURED === GENERATOR_MODEL
    ? // Wenn primary == fallback, bringt der Fallback nichts → gpt-4o nehmen.
      "gpt-4o"
    : FALLBACK_CONFIGURED

/**
 * Erkennt Reasoning-Modelle (GPT-5-Familie, o-Serie), die intern "nachdenken"
 * und dadurch bei komplexen Prompts deutlich langsamer sind. Für unsere
 * strukturierte JSON-Generierung brauchen wir KEINE tiefe Chain-of-Thought —
 * niedriger Effort ist der größte Latenzhebel ohne echten Qualitätsverlust.
 */
export function isReasoningModel(model: string): boolean {
  const m = model.trim().toLowerCase()
  return (
    m.startsWith("gpt-5") ||
    m.startsWith("o1") ||
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m.startsWith("o5")
  )
}

/**
 * Von der GPT-5-Familie akzeptierte Werte. ACHTUNG: "minimal" gehört NICHT
 * dazu — sowohl gpt-5.4 als auch gpt-5.6-terra lehnen es mit
 * `unsupported_value` ab und die Generierung schlägt komplett fehl. Der
 * korrekte Wert für "gar kein Reasoning" ist "none".
 *
 * "max" wird von gpt-5.6-terra unterstützt, von gpt-5.4 nicht — beim Wechsel
 * des Primärmodells also prüfen, ob ein gesetzter Wert dort noch gilt.
 */
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max"

const VALID_EFFORTS: readonly string[] = ["none", "low", "medium", "high", "xhigh", "max"]

/**
 * Reasoning-Effort für die Generierung. Default "none".
 *
 * Gemessen mit gpt-5.6-terra und unserem echten Prompt über 6 Fachthemen der
 * Stufen 3–5, fachlich begutachtet durch ein unabhängiges Modell:
 *   effort=none   → Ø 31,4 s | 0 Reasoning-Tok | Ø 2024 out | 0 ungültig | 5/6 ohne Beanstandung
 *   effort=low    → Ø 43,7 s | 899            | Ø 2880     | 0 ungültig | 4/6
 *   effort=medium → Ø 56,7 s | 1542           | Ø 4085     | 1 ungültig | 3/6
 * In KEINER Stufe trat ein echter Fachfehler auf (falsche Antwort,
 * Mehrdeutigkeit, erfundener Begriff) — nur sprachliche Kleinigkeiten, die der
 * Facharzt-Gegencheck ohnehin korrigiert. Fachlich sind "none" und "low"
 * ununterscheidbar, die Latenz unterscheidet sich aber konsistent um ~12 s.
 * Deshalb "none". Grund: Unser System-Prompt gibt Struktur, Schwierigkeitsanker
 * und Selbst-Check bereits vollständig vor; das Modell muss sich den Lösungsweg
 * nicht erst selbst erarbeiten.
 *
 * Per `OPENAI_GENERATOR_REASONING_EFFORT` überschreibbar. Ungültige Werte
 * fallen auf "none" zurück, statt einen Request-Fehler zu provozieren.
 */
export function generatorReasoningEffort(): ReasoningEffort {
  const raw = process.env.OPENAI_GENERATOR_REASONING_EFFORT?.trim().toLowerCase()
  if (raw && VALID_EFFORTS.includes(raw)) return raw as ReasoningEffort
  if (raw) {
    console.warn(
      `[generator] Ungültiger OPENAI_GENERATOR_REASONING_EFFORT="${raw}" — erlaubt: ${VALID_EFFORTS.join(", ")}. Nutze "none".`
    )
  }
  return "none"
}

/** Text-Verbosity für die Responses-API. Default "medium". */
export function generatorVerbosity(): "low" | "medium" | "high" {
  const raw = process.env.OPENAI_GENERATOR_VERBOSITY?.trim().toLowerCase()
  if (raw === "low" || raw === "medium" || raw === "high") return raw
  return "medium"
}

/**
 * Token-Limit für vollständige Fragen inkl. Erklärungen.
 *
 * Hochgesetzt: das neue Erklärungs-Mandat verlangt Drei-Abschnitts-Struktur in
 * der Gesamterklärung (Pathophysiologie / klin. Algorithmus / Take-Home),
 * ≥4 Sätze für die korrekte Option, ≥3 Sätze für jeden Distraktor.
 *
 * Faustregel: ~1.6 Tokens pro deutsches Wort, ~14 Wörter pro Satz → ~22 Tokens
 * pro Satz. Bei 5 Optionen + Gesamterklärung + keyTakeaway + mustKnow +
 * highYield landen wir pro Frage ≈ 1500–2500 Output-Tokens. Wir geben großzügig
 * Puffer, damit das Modell sich nicht selbst kürzt, wenn es mehr Tiefe produziert.
 */
export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 5200
  return 2200 + caseQuestionCount * 3200
}

/**
 * Token-Limit für Stufe 1 (Frage + Optionen + keyTakeaway, keine Erklärungen).
 *
 * Gemessen an echten Fragen: Fragestellung und die fünf Optionen zusammen sind
 * 160 Tokens — 8 % der Gesamtausgabe von ~2100. Mit keyTakeaway und
 * JSON-Gerüst landen wir bei ~280 pro Frage. Das Limit liegt bewusst um ein
 * Vielfaches darüber, damit ein ausführlicher Falltext nicht abgeschnitten wird.
 */
export function draftMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 1400
  return 900 + caseQuestionCount * 800
}

/**
 * Token-Limit für Stufe 2 (Erklärungen zu GENAU EINER feststehenden Frage).
 *
 * Gemessen: 1813 Tokens für Gesamterklärung, mustKnow, highYield, mnemonic und
 * die fünf Options-Erklärungen. 3800 gibt reichlich Puffer, damit das Modell
 * sich bei tiefen Themen nicht selbst kürzt.
 */
export function enrichMaxOutputTokens(): number {
  return 3800
}

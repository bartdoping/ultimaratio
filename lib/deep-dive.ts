import type { BulkQuestion } from "@/lib/question-bulk-json"
import type { GeneratorSection } from "@/lib/generator-section"
import { buildSystemInstructions } from "@/lib/ai-question-generator-prompt"
import { deepDiveMaxOutputTokens } from "@/lib/generator-ai-config"
import { callGeneratorModelWithRetry } from "@/lib/generator-openai"

/**
 * Vertiefung auf Anforderung.
 *
 * Die Standard-Erklärung ist bewusst kurz (Aha-Satz, ein Satz je Option,
 * Merkregel). Wer mehr will, tippt auf "Mehr verstehen" — erst dann entsteht
 * die Vertiefung, und bei Poolfragen wird sie für alle gespeichert. So zahlt
 * man die lange Erklärung nur, wenn jemand sie liest, und höchstens einmal
 * pro Frage.
 */

export function buildDeepDiveInput(q: BulkQuestion, meta: { topic: string; difficulty: number; section: GeneratorSection }): string {
  const b = (i: number) => String.fromCharCode(65 + i)
  return [
    "VERTIEFUNG zu einer bereits beantworteten Frage. Der Studierende hat den Aha-Satz gelesen und will das Prinzip wirklich verstehen.",
    "",
    `Thema: ${meta.topic} · Stufe ${meta.difficulty} von 5 · Abschnitt: ${meta.section}`,
    q.caseVignette ? `Falltext: ${q.caseVignette}` : "",
    `Frage: ${q.stem}`,
    ...q.options.map((o, i) => `${b(i)}) ${o.text}${o.isCorrect ? "  [richtig]" : ""}`),
    q.keyTakeaway ? `Bereits gelesener Aha-Satz: ${q.keyTakeaway}` : "",
    "",
    "Schreibe GENAU DREI kurze Absätze (zusammen höchstens 160 Wörter), getrennt durch eine Leerzeile:",
    "1) Der Mechanismus aus ersten Prinzipien — warum das so ist.",
    "2) Die Denkkette zur Lösung, inklusive des typischen Denkfehlers und warum er hier in die Irre führt.",
    "3) Eine Perle: ein konkretes, prüfungsrelevantes Detail, das selbst gute Studierende übersehen.",
    "Keine Wiederholung des Aha-Satzes, keine Aufzählungszeichen, keine Überschriften, keine Floskeln.",
    "",
    'Antworte ausschließlich als JSON: {"vertiefung": "Absatz 1\\n\\nAbsatz 2\\n\\nAbsatz 3"}',
  ]
    .filter((z) => z !== "")
    .join("\n")
}

/** Liest die Vertiefung tolerant; null bei unbrauchbarer Antwort. */
export function parseDeepDive(raw: string): string | null {
  try {
    const start = raw.indexOf("{")
    const ende = raw.lastIndexOf("}")
    const d = JSON.parse(start >= 0 && ende > start ? raw.slice(start, ende + 1) : raw) as { vertiefung?: unknown }
    const t = typeof d.vertiefung === "string" ? d.vertiefung.trim() : ""
    return t.length >= 80 ? t.slice(0, 3000) : null
  } catch {
    return null
  }
}

export async function generateDeepDive(
  q: BulkQuestion,
  meta: { topic: string; difficulty: number; section: GeneratorSection },
  signal?: AbortSignal
): Promise<string | null> {
  const raw = await callGeneratorModelWithRetry({
    instructions: buildSystemInstructions(),
    input: buildDeepDiveInput(q, meta),
    maxOutputTokens: deepDiveMaxOutputTokens(),
    signal,
    purpose: "deepdive",
  })
  return parseDeepDive(raw)
}

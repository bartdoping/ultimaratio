import type { GeneratorSection } from "@/lib/generator-section"
import { runDraftPhase, runEnrichPhase } from "@/lib/generator-run"
import { addToPool, type ServedQuestion } from "@/lib/pool"

/**
 * Erzeugt EINE vollständige Einzelfrage (Entwurf + Prüfungen + Aha-Erklärung)
 * und legt sie im Pool ab.
 *
 * Wird nur aufgerufen, wenn der Pool für Thema und Stufe nichts Ungesehenes
 * mehr hat. Im Kreuz-Modus läuft das im Hintergrund, während der Nutzer die
 * Fragen aus seinem Puffer beantwortet — die Wartezeit sieht er nicht.
 */
export async function generateIntoPool(opts: {
  topic: string
  difficulty: number
  section: GeneratorSection
  userId?: string | null
  signal: AbortSignal
}): Promise<ServedQuestion | null> {
  const ctx = {
    topic: opts.topic,
    difficulty: opts.difficulty,
    mode: "single" as const,
    section: opts.section,
    expectedCount: 1,
    signal: opts.signal,
    userId: opts.userId ?? null,
  }
  const draft = await runDraftPhase(ctx)
  if (!draft.ok) return null
  const enriched = await runEnrichPhase(ctx, draft.questions)
  if (enriched.failedIndices.length > 0) return null

  const q = enriched.questions[0]
  const [id] = await addToPool([q], { topic: opts.topic, difficulty: opts.difficulty, section: opts.section })
  if (!id) return null
  return { poolQuestionId: id, topic: opts.topic, difficulty: opts.difficulty, section: opts.section, question: q }
}

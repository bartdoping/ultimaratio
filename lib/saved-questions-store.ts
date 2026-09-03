import { randomUUID } from "crypto"
import prisma from "@/lib/db"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import type { GeneratorSection } from "@/lib/generator-section"

/**
 * Ablage der generierten Fragen.
 *
 * Gespeichert wird ausschließlich für ANGEMELDETE Nutzer und ausschließlich
 * serverseitig direkt nach der Generierung — nicht über einen zusätzlichen
 * Client-Aufruf. So kann der Browser weder den Inhalt fälschen noch das
 * Speichern durch einen Verbindungsabbruch verlieren.
 *
 * Grenze: Pro Nutzer werden höchstens `MAX_PRO_NUTZER` Fragen behalten; ältere
 * fallen heraus. Ohne Obergrenze wüchse die Ablage unbegrenzt, und ein halbes
 * Jahr alte Fragen haben für die Prüfungsvorbereitung keinen Wert mehr.
 */

export const MAX_PRO_NUTZER = 1000

export type SaveMeta = {
  topic: string
  difficulty: number
  mode: "single" | "case"
  section: GeneratorSection
  sourceLabel?: string | null
}

/**
 * Speichert eine Generierung. Best-effort: Ein Fehler hier darf die bereits
 * erzeugte Frage NICHT verlieren — der Nutzer hat sie schon vor sich.
 * Rückgabe sind die IDs in der Reihenfolge der Fragen, oder null.
 */
export async function saveGeneratedQuestions(
  userId: string,
  questions: BulkQuestion[],
  meta: SaveMeta
): Promise<string[] | null> {
  if (!userId || questions.length === 0) return null

  try {
    const groupId = randomUUID()
    const ids: string[] = []

    // createMany liefert keine IDs zurück; wir brauchen sie für die
    // Antwort-Erfassung im Client, also einzeln anlegen.
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const row = await prisma.savedQuestion.create({
        data: {
          userId,
          groupId,
          orderInGroup: i,
          topic: meta.topic.slice(0, 300),
          difficulty: Math.min(5, Math.max(1, Math.round(meta.difficulty))),
          mode: meta.mode,
          section: meta.section,
          sourceLabel: meta.sourceLabel?.slice(0, 200) ?? null,
          stem: q.stem.slice(0, 2000),
          payload: q as unknown as object,
        },
        select: { id: true },
      })
      ids.push(row.id)
    }

    await pruneOldest(userId)
    return ids
  } catch (e) {
    console.error("[saved-questions] Speichern fehlgeschlagen:", e)
    return null
  }
}

/** Entfernt die ältesten Fragen über der Obergrenze. */
async function pruneOldest(userId: string): Promise<void> {
  const anzahl = await prisma.savedQuestion.count({ where: { userId } })
  if (anzahl <= MAX_PRO_NUTZER) return

  const zuViel = anzahl - MAX_PRO_NUTZER
  const alte = await prisma.savedQuestion.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: zuViel,
    select: { id: true },
  })
  if (alte.length === 0) return
  await prisma.savedQuestion.deleteMany({
    where: { id: { in: alte.map((a) => a.id) } },
  })
}

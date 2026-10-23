import prisma from "@/lib/db"
import { payloadToQuestion } from "@/lib/saved-questions"
import { shuffleOptions } from "@/lib/option-order"
import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Öffentlich sichtbare Poolfragen (geteilte Links, Frage des Tages).
 *
 * Poolfragen enthalten keine personenbezogenen Daten — sie entstehen aus
 * Thema und Stufe, nicht aus Nutzereingaben über Personen. Ausgesonderte
 * Fragen (gemeldet, schlechte Trennschärfe) werden nie gezeigt.
 */

export type PublicQuestionData = {
  id: string
  topic: string
  difficulty: number
  question: BulkQuestion
}

export async function loadPublicQuestion(id: string, opts: { shuffle?: boolean } = {}): Promise<PublicQuestionData | null> {
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return null
  const pq = await prisma.poolQuestion.findUnique({
    where: { id },
    select: { id: true, topic: true, difficulty: true, payload: true, status: true },
  })
  if (!pq || pq.status !== "active") return null
  const q = payloadToQuestion(pq.payload)
  if (!q) return null
  return { id: pq.id, topic: pq.topic, difficulty: pq.difficulty, question: opts.shuffle === false ? q : shuffleOptions(q) }
}

/** Tagesindex (Europe/Berlin), damit die Frage um Mitternacht wechselt. */
export function dayIndex(now: Date = new Date()): number {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now)
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000)
}

/**
 * Frage des Tages: bevorzugt bewährte Fragen (genug Antworten, nicht
 * gemeldet), deterministisch pro Tag — alle sehen dieselbe.
 */
export async function questionOfTheDay(now: Date = new Date()): Promise<PublicQuestionData | null> {
  const basis = { status: "active", reportCount: 0 } as const
  let n = await prisma.poolQuestion.count({ where: { ...basis, answeredCount: { gte: 10 } } })
  const bewaehrt = n > 0
  if (!bewaehrt) n = await prisma.poolQuestion.count({ where: basis })
  if (n === 0) return null
  const [row] = await prisma.poolQuestion.findMany({
    where: bewaehrt ? { ...basis, answeredCount: { gte: 10 } } : basis,
    orderBy: { id: "asc" },
    skip: dayIndex(now) % n,
    take: 1,
    select: { id: true },
  })
  return row ? loadPublicQuestion(row.id) : null
}

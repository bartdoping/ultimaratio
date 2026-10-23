import { createHash } from "crypto"
import prisma from "@/lib/db"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import type { GeneratorSection } from "@/lib/generator-section"
import { payloadToQuestion } from "@/lib/saved-questions"
import { shuffleOptions } from "@/lib/option-order"
import { evaluatePoolQuestion, pointBiserial } from "@/lib/pool-quality"

/**
 * Gemeinsamer Fragenpool.
 *
 * Jede vollständig erzeugte und geprüfte Einzelfrage landet hier und wird an
 * alle ausgeliefert, die dasselbe Thema auf derselben Stufe kreuzen und sie
 * noch nicht gesehen haben. Das bringt:
 *   - Sofort-Antworten statt 15–30 s Generierung,
 *   - einen Bruchteil der KI-Kosten pro ausgelieferter Frage,
 *   - echte Antwortstatistiken pro Frage — schlechte Fragen fliegen raus
 *     (lib/pool-quality.ts). Dieser Datenbestand ist nicht kopierbar.
 *
 * Der Pool enthält keine personenbezogenen Daten: nur die Frage selbst.
 */

/** Normalisiertes Thema für die Suche: Kleinschreibung, ohne Satzzeichen. */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Inhaltlicher Fingerabdruck — dieselbe Frage landet nur einmal im Pool. */
export function contentHash(q: Pick<BulkQuestion, "stem" | "options">): string {
  const n = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim()
  const teile = [n(q.stem), ...q.options.map((o) => n(o.text)).sort()]
  return createHash("sha256").update(teile.join("␞")).digest("hex")
}

export type PoolMeta = { topic: string; difficulty: number; section: GeneratorSection }

/**
 * Legt vollständige Einzelfragen im Pool ab. Nur Fragen mit Aha-Satz und
 * Erklärung zu jeder Option — eine halbe Frage gehört nicht in den Pool.
 * Liefert die Pool-IDs in derselben Reihenfolge (null = nicht abgelegt).
 */
export async function addToPool(questions: BulkQuestion[], meta: PoolMeta): Promise<(string | null)[]> {
  const ids: (string | null)[] = []
  for (const q of questions) {
    const vollstaendig =
      !!q.keyTakeaway?.trim() && q.options.length === 5 && q.options.every((o) => !!o.explanation?.trim())
    if (!vollstaendig || q.caseVignette) {
      ids.push(null)
      continue
    }
    try {
      const hash = contentHash(q)
      const row = await prisma.poolQuestion.upsert({
        where: { contentHash: hash },
        update: {},
        create: {
          topicKey: normalizeTopic(meta.topic),
          topic: meta.topic.slice(0, 200),
          difficulty: Math.min(5, Math.max(1, Math.round(meta.difficulty))),
          section: meta.section,
          stem: q.stem.slice(0, 2000),
          payload: q as unknown as object,
          contentHash: hash,
        },
        select: { id: true },
      })
      ids.push(row.id)
    } catch (e) {
      console.error("[pool] Ablage fehlgeschlagen:", e)
      ids.push(null)
    }
  }
  return ids
}

export type ServedQuestion = {
  poolQuestionId: string
  topic: string
  difficulty: number
  section: GeneratorSection
  question: BulkQuestion
}

/**
 * Sucht ungesehene Poolfragen. Bevorzugt Fragen mit wenig Auslieferungen —
 * so sammeln neue Fragen schnell genug Antworten für eine Qualitätsaussage,
 * statt dass immer dieselben gezeigt werden.
 */
export async function pickFromPool(opts: {
  topics: string[]
  difficulty: number
  limit: number
  excludeIds?: string[]
  userId?: string | null
}): Promise<ServedQuestion[]> {
  if (opts.limit <= 0 || opts.topics.length === 0) return []
  const topicKeys = [...new Set(opts.topics.map(normalizeTopic).filter(Boolean))]
  const kandidaten = await prisma.poolQuestion.findMany({
    where: {
      topicKey: { in: topicKeys },
      difficulty: Math.round(opts.difficulty),
      status: "active",
      ...(opts.excludeIds?.length ? { id: { notIn: opts.excludeIds.slice(0, 500) } } : {}),
      ...(opts.userId ? { seen: { none: { userId: opts.userId } } } : {}),
    },
    orderBy: { servedCount: "asc" },
    take: Math.max(opts.limit * 4, 12),
    select: { id: true, topic: true, difficulty: true, section: true, payload: true },
  })

  // Aus den am wenigsten gezeigten zufällig wählen — sonst bekäme jeder
  // dieselbe Reihenfolge.
  for (let i = kandidaten.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kandidaten[i], kandidaten[j]] = [kandidaten[j], kandidaten[i]]
  }

  const out: ServedQuestion[] = []
  for (const k of kandidaten) {
    if (out.length >= opts.limit) break
    const q = payloadToQuestion(k.payload)
    if (!q) continue
    out.push({
      poolQuestionId: k.id,
      topic: k.topic,
      difficulty: k.difficulty,
      section: (k.section as GeneratorSection) ?? "auto",
      // Bei jeder Auslieferung neu gemischt: Wer eine Frage geteilt bekommt,
      // kann sich die Position der Lösung nicht merken.
      question: shuffleOptions(q),
    })
  }
  return out
}

/** Vermerkt die Auslieferung (Zähler + "gesehen" für angemeldete Nutzer). */
export async function markServed(ids: string[], userId?: string | null): Promise<void> {
  if (ids.length === 0) return
  try {
    await prisma.poolQuestion.updateMany({ where: { id: { in: ids } }, data: { servedCount: { increment: 1 } } })
    if (userId) {
      await prisma.poolSeen.createMany({
        data: ids.map((poolQuestionId) => ({ userId, poolQuestionId })),
        skipDuplicates: true,
      })
    }
  } catch (e) {
    console.error("[pool] markServed fehlgeschlagen:", e)
  }
}

/**
 * Erfasst eine Antwort. Ob sie richtig ist, entscheidet der SERVER anhand des
 * gewählten Optionstexts — nicht der Browser. Die Optionen werden bei jeder
 * Auslieferung gemischt, deshalb zählt der Text, nicht die Position.
 */
export async function recordPoolAnswer(opts: {
  poolQuestionId: string
  chosenText: string
  userId?: string | null
  msToAnswer?: number | null
}): Promise<{ correct: boolean; question: BulkQuestion } | null> {
  const pq = await prisma.poolQuestion.findUnique({
    where: { id: opts.poolQuestionId },
    select: { id: true, payload: true },
  })
  if (!pq) return null
  const q = payloadToQuestion(pq.payload)
  if (!q) return null

  const norm = (t: string) => t.replace(/\s+/g, " ").trim()
  const chosenIndex = q.options.findIndex((o) => norm(o.text) === norm(opts.chosenText))
  if (chosenIndex < 0) return null
  const correct = q.options[chosenIndex].isCorrect

  // Stärke des Antwortenden = Trefferquote seiner letzten Antworten. Nur so
  // lässt sich später sagen, ob Starke oder Schwache an einer Frage scheitern.
  let userAccuracy: number | null = null
  if (opts.userId) {
    const letzte = await prisma.poolAnswer.findMany({
      where: { userId: opts.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { correct: true },
    })
    if (letzte.length >= 10) userAccuracy = letzte.filter((a) => a.correct).length / letzte.length
  }

  const ms = typeof opts.msToAnswer === "number" && opts.msToAnswer > 0 ? Math.min(opts.msToAnswer, 3_600_000) : null
  await prisma.$transaction([
    prisma.poolAnswer.create({
      data: { poolQuestionId: pq.id, userId: opts.userId ?? null, correct, chosenIndex, msToAnswer: ms, userAccuracy },
    }),
    prisma.poolQuestion.update({
      where: { id: pq.id },
      data: { answeredCount: { increment: 1 }, correctCount: { increment: correct ? 1 : 0 } },
    }),
  ])

  void reviewQuality(pq.id).catch(() => {})
  return { correct, question: q }
}

/** Meldung einer Poolfrage durch einen Nutzer. */
export async function reportPoolQuestion(poolQuestionId: string): Promise<void> {
  await prisma.poolQuestion
    .update({ where: { id: poolQuestionId }, data: { reportCount: { increment: 1 } } })
    .catch(() => {})
  void reviewQuality(poolQuestionId).catch(() => {})
}

/**
 * Prüft eine Frage gegen die Qualitätsregeln und zieht sie bei Bedarf zurück.
 * Die Trennschärfe wird nur alle 10 Antworten neu berechnet — sie braucht die
 * Antworthistorie und ist zwischen zwei Antworten ohnehin kaum verschieden.
 */
export async function reviewQuality(poolQuestionId: string): Promise<void> {
  const pq = await prisma.poolQuestion.findUnique({
    where: { id: poolQuestionId },
    select: { status: true, answeredCount: true, correctCount: true, reportCount: true },
  })
  if (!pq || pq.status !== "active") return

  let discrimination: number | null = null
  if (pq.answeredCount >= 30 && pq.answeredCount % 10 === 0) {
    const answers = await prisma.poolAnswer.findMany({
      where: { poolQuestionId },
      select: { correct: true, userAccuracy: true },
      take: 2000,
    })
    discrimination = pointBiserial(answers)
  }

  const urteil = evaluatePoolQuestion({ ...pq, discrimination })
  if (urteil.retire) {
    await prisma.poolQuestion.update({
      where: { id: poolQuestionId },
      data: { status: "retired", retiredReason: urteil.reason.slice(0, 200) },
    })
    console.warn(`[pool] Frage ${poolQuestionId} zurückgezogen: ${urteil.reason}`)
  }
}

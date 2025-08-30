// app/practice/deck/[deckId]/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect, notFound } from "next/navigation"
import prisma from "@/lib/db"
import { RunnerClient } from "@/components/runner-client"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ deckId: string }> }

// kleine Helfer
function isAutoDeck(id: string) {
  return id === "auto:flagged" || id === "auto:wrong"
}
type ClientQuestion = {
  id: string
  stem: string
  tip: string | null
  explanation: string | null
  options: { id: string; text: string; isCorrect: boolean; explanation: string | null }[]
  media: { id: string; url: string; alt: string; order: number }[]
  caseId: string | null
  caseTitle: string | null
  caseVignette: string | null
  caseOrder: number | null
  examId?: string | null
}

export default async function DeckPracticePage({ params }: Props) {
  const { deckId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) redirect("/login")

  let clientQuestions: ClientQuestion[] = []
  let title = "Deck"
  let firstExamId: string | null = null

  if (isAutoDeck(deckId)) {
    // --- AUTO DECKS ---
    if (deckId === "auto:flagged") {
      title = "Markierte Fragen"
      const flags = await prisma.userQuestionFlag.findMany({
        where: { userId: me.id },
        select: { questionId: true, flaggedAt: true },
        orderBy: { flaggedAt: "desc" },
      })
      const ids = flags.map(f => f.questionId)
      if (ids.length > 0) {
        const qs = await prisma.question.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, stem: true, tip: true, explanation: true, examId: true,
            options: { orderBy: { id: "asc" }, select: { id: true, text: true, isCorrect: true, explanation: true } },
            media: { orderBy: { order: "asc" }, include: { media: true } },
            case: { select: { id: true, title: true, vignette: true, order: true } },
          }
        })
        // Reihenfolge wie flags
        const orderMap = new Map(ids.map((qId, i) => [qId, i]))
        qs.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!))

        clientQuestions = qs.map(q => ({
          id: q.id,
          stem: q.stem,
          tip: q.tip ?? null,
          explanation: q.explanation ?? null,
          options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, explanation: o.explanation ?? null })),
          media: (q.media ?? []).map((m: any) => ({ id: m.media.id, url: m.media.url, alt: m.media.alt ?? "", order: m.order ?? 0 })),
          caseId: q.case?.id ?? null,
          caseTitle: q.case?.title ?? null,
          caseVignette: q.case?.vignette ?? null,
          caseOrder: q.case?.order ?? null,
          examId: q.examId,
        }))
      }
    } else {
      title = "Falsch beantwortet"
      // nimm konsolidierte Lernstatistik
      const wrongs = await prisma.userQuestionStat.findMany({
        where: { userId: me.id, wrongCount: { gt: 0 } },
        select: { questionId: true, lastWrongAt: true },
        orderBy: [{ lastWrongAt: "desc" }],
      })
      const ids = wrongs.map(w => w.questionId)
      if (ids.length > 0) {
        const qs = await prisma.question.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, stem: true, tip: true, explanation: true, examId: true,
            options: { orderBy: { id: "asc" }, select: { id: true, text: true, isCorrect: true, explanation: true } },
            media: { orderBy: { order: "asc" }, include: { media: true } },
            case: { select: { id: true, title: true, vignette: true, order: true } },
          }
        })
        // Reihenfolge wie wrongs
        const orderMap = new Map(ids.map((qId, i) => [qId, i]))
        qs.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!))

        clientQuestions = qs.map(q => ({
          id: q.id,
          stem: q.stem,
          tip: q.tip ?? null,
          explanation: q.explanation ?? null,
          options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, explanation: o.explanation ?? null })),
          media: (q.media ?? []).map((m: any) => ({ id: m.media.id, url: m.media.url, alt: m.media.alt ?? "", order: m.order ?? 0 })),
          caseId: q.case?.id ?? null,
          caseTitle: q.case?.title ?? null,
          caseVignette: q.case?.vignette ?? null,
          caseOrder: q.case?.order ?? null,
          examId: q.examId,
        }))
      }
    }

    if (clientQuestions.length === 0) {
      return <div className="p-6">
        <div className="text-xl font-semibold mb-2">{title}</div>
        <div>Dieses Auto-Deck ist leer.</div>
      </div>
    }

    // ExamId für Timer/Attempt (irrelevant im Practice-Modus, aber vorhanden)
    firstExamId = clientQuestions.find(q => !!q.examId)?.examId ?? null

  } else {
    // --- NORMALES DECK ---
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: me.id },
      select: {
        id: true,
        items: {
          orderBy: { order: "asc" },
          select: {
            question: {
              select: {
                id: true, stem: true, tip: true, explanation: true, examId: true,
                options: { orderBy: { id: "asc" }, select: { id: true, text: true, isCorrect: true, explanation: true } },
                media: { orderBy: { order: "asc" }, include: { media: true } },
                case: { select: { id: true, title: true, vignette: true, order: true } },
              }
            }
          }
        }
      }
    })
    if (!deck) notFound()

    const qs = deck.items.map(it => it.question)
    if (qs.length === 0) return <div className="p-6">Dieses Deck ist leer.</div>

    firstExamId = qs[0].examId ?? null
    clientQuestions = qs.map(q => ({
      id: q.id,
      stem: q.stem,
      tip: q.tip ?? null,
      explanation: q.explanation ?? null,
      options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, explanation: o.explanation ?? null })),
      media: (q.media ?? []).map((m: any) => ({ id: m.media.id, url: m.media.url, alt: m.media.alt ?? "", order: m.order ?? 0 })),
      caseId: q.case?.id ?? null,
      caseTitle: q.case?.title ?? null,
      caseVignette: q.case?.vignette ?? null,
      caseOrder: q.case?.order ?? null,
      examId: q.examId ?? null,
    }))
  }

  // Attempt (Training) – nur falls wir eine ExamId haben
  let attempt: { id: string; elapsedSec: number | null } | null = null
  if (firstExamId) {
    attempt = await prisma.attempt.findFirst({
      where: { userId: me.id, examId: firstExamId, finishedAt: null },
      select: { id: true, elapsedSec: true }
    })
    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: { userId: me.id, examId: firstExamId },
        select: { id: true, elapsedSec: true }
      })
    }
  } else {
    // Fallback-Attempt für gemischte Auto-Decks ohne ExamId
    attempt = await prisma.attempt.create({
      data: { userId: me.id, examId: "mixed-auto" },
      select: { id: true, elapsedSec: true }
    })
  }

  const qIds = clientQuestions.map(q => q.id)
  const initialAnswersArr = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt!.id, questionId: { in: qIds } },
    select: { questionId: true, answerOptionId: true }
  })
  const initialAnswers = Object.fromEntries(initialAnswersArr.map(a => [a.questionId, a.answerOptionId] as const))

  return (
    <main className="max-w-5xl mx-auto p-6">
      <RunnerClient
        attemptId={attempt!.id}
        examId={firstExamId ?? "mixed-auto"}
        passPercent={0}
        allowImmediateFeedback={true}
        questions={clientQuestions}
        initialAnswers={initialAnswers}
        initialElapsedSec={attempt!.elapsedSec ?? 0}
        mode="practice"
        initialExamMode={true}
      />
    </main>
  )
}
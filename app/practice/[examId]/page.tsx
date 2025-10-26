// app/practice/[examId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { RunnerClient } from "@/components/runner-client"

type Params = { examId: string }
type SearchParams = Record<string, string | string[] | undefined>

type Props = {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}

export const dynamic = "force-dynamic"

export default async function PracticePage({ params, searchParams }: Props) {
  const { examId } = await params

  // --- searchParams robust parsen (verhindert TS-Fehler) ---
  const sp = (await (searchParams ?? Promise.resolve({} as SearchParams))) as SearchParams
  const deckId: string | undefined = (() => {
    const v = sp?.deckId
    if (Array.isArray(v)) return v[0]
    if (typeof v === "string") return v
    return undefined
  })()

  // Session & User
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  // Optional: Deck-Filter laden & validieren
  let deckQuestionIds: string[] | null = null
  if (deckId) {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: me.id },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { question: { select: { id: true, examId: true } } },
        },
      },
    })
    if (!deck) notFound()

    // Alle Fragen im Deck müssen zur examId der Route passen (MVP)
    const foreign = deck.items.find((it) => it.question.examId !== examId)
    if (foreign) notFound()

    deckQuestionIds = deck.items.map((it) => it.question.id)
  }

  // Attempt finden/erzeugen (Practice nutzt Attempt für Zeit/Heartbeat;
  // erscheint nicht in der Historie solange nicht "finish" aufgerufen wird)
  let attempt = await prisma.attempt.findFirst({
    where: { userId: me.id, examId, finishedAt: null },
    select: { id: true, startedAt: true, finishedAt: true, elapsedSec: true },
  })
  if (!attempt) {
    attempt = await prisma.attempt.create({
      data: { userId: me.id, examId },
      select: { id: true, startedAt: true, finishedAt: true, elapsedSec: true },
    })
  }

  // Exam + Fragen + Optionen + MEDIA + CASE
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      passPercent: true,
      // Im Practice darf Nutzer Feedback toggeln → allowImmediateFeedback: true
      allowImmediateFeedback: true,
      questions: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          stem: true,
          tip: true,
          explanation: true,
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true, isCorrect: true, explanation: true },
          },
          media: { orderBy: { order: "asc" }, include: { media: true } },
          case: { select: { id: true, title: true, vignette: true, order: true } },
        },
      },
    },
  })
  if (!exam) notFound()

  // Falls Deck-Filter aktiv → auf die Fragen in deckQuestionIds begrenzen und in Deck-Reihenfolge sortieren
  let qs = exam.questions
  if (deckQuestionIds && deckQuestionIds.length > 0) {
    const orderIndex = new Map(deckQuestionIds.map((id, i) => [id, i]))
    qs = qs
      .filter((q) => orderIndex.has(q.id))
      .sort((a, b) => (orderIndex.get(a.id)! - orderIndex.get(b.id)!))
  }

  // Bereits gegebene Antworten (falls vorhanden)
  const given = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, answerOptionId: true },
  })
  const initialAnswers = Object.fromEntries(
    given.map((g) => [g.questionId, g.answerOptionId] as const)
  )

  // Optional: Markierungen (Stars) des Users für diese Prüfung
  const stars = await prisma.questionStar.findMany({
    where: { userId: me.id, question: { examId } },
    select: { questionId: true },
  })
  const starredSet = new Set<string>(stars.map((s) => s.questionId as string))

  // Client-Shape
  const questions = qs.map((q) => ({
    id: q.id,
    stem: q.stem,
    tip: q.tip ?? null,
    explanation: q.explanation ?? null,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
      explanation: o.explanation ?? null,
    })),
    media:
      q.media?.map((m) => ({
        id: m.media.id,
        url: m.media.url,
        alt: m.media.alt ?? "",
        order: (m as any).order ?? 0,
      })) ?? [],
    caseId: q.case?.id ?? null,
    caseTitle: q.case?.title ?? null,
    caseVignette: q.case?.vignette ?? null,
    caseOrder: q.case?.order ?? null,
    __starred: starredSet.has(q.id),
  }))

  const initialElapsedSec = attempt.elapsedSec ?? 0

  return (
    <div className="w-full">
      <RunnerClient
        attemptId={attempt.id}
        examId={exam.id}
        passPercent={exam.passPercent}
        allowImmediateFeedback={true}
        questions={questions}
        initialAnswers={initialAnswers}
        initialElapsedSec={initialElapsedSec}
        mode="practice"
        initialFilterMode="all"
      />
    </div>
  )
}
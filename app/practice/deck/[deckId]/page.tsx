import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect, notFound } from "next/navigation"
import prisma from "@/lib/db"
import { RunnerClient } from "@/components/runner-client"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ deckId: string }> }

export default async function DeckPracticePage({ params }: Props) {
  const { deckId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) redirect("/login")

  // Deck + Fragen
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

  // Für den Client: irgendeine Exam-ID mitschicken (wird im Practice nicht serverseitig verwendet)
  const firstExamId = qs[0].examId

  // Practice nutzt KEINE Attempts. Wir geben nur einen stabilen LocalStorage-Key:
  const practiceAttemptId = `practice:${deck.id}:${me.id}`

  // Im Practice haben wir keine initial gespeicherten Antworten
  const initialAnswers: Record<string, string | undefined> = {}

  const clientQuestions = qs.map(q => ({
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
  }))

  return (
    <main className="max-w-5xl mx-auto p-6">
      <RunnerClient
        attemptId={practiceAttemptId}      // nur für LocalStorage-Keys
        examId={firstExamId}
        passPercent={0}
        allowImmediateFeedback={true}
        questions={clientQuestions}
        initialAnswers={initialAnswers}
        initialElapsedSec={0}
        mode="practice"
        initialExamMode={true} // Sofort-Feedback standardmäßig AUS (umschaltbar)
      />
    </main>
  )
}
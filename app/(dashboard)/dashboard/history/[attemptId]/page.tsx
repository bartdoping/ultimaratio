// app/(dashboard)/dashboard/history/[attemptId]/page.tsx
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Button } from "@/components/ui/button"
import { DeleteAttemptButton } from "@/components/history-actions"

type PageProps = {
  params: Promise<{ attemptId: string }>
}

export default async function HistoryDetailPage({ params }: PageProps) {
  const { attemptId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id as string },
    include: {
      exam: { select: { title: true } },
      answers: {
        include: {
          question: { select: { stem: true } },
          answerOption: { select: { text: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  })

  if (!attempt) notFound()

  return (
    <main className="container mx-auto max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Ergebnis: {attempt.exam.title}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/history">Zurück</Link>
          </Button>
          {/* Wichtig: Prop heißt id (nicht attemptId) */}
          <DeleteAttemptButton id={attemptId} />
        </div>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>Punkte: {attempt.scorePercent ?? 0}%</p>
        <p>Bestanden: {attempt.passed ? "Ja" : "Nein"}</p>
      </div>

      <div className="space-y-4">
        {attempt.answers.map((a) => (
          <div key={a.id} className="rounded border p-4">
            <div className="font-medium mb-1">{a.question.stem}</div>
            <div>
              Deine Antwort: {a.answerOption.text}{" "}
              <span className={a.isCorrect ? "text-green-600" : "text-red-600"}>
                {a.isCorrect ? "✅ richtig" : "❌ falsch"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
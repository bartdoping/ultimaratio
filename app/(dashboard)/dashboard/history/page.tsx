// app/(dashboard)/history/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"
import { DeleteAllAttemptsButton, DeleteAttemptButton } from "@/components/history-actions"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Historie</h1>
        <p className="text-muted-foreground">Bitte zuerst einloggen.</p>
      </div>
    )
  }

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  const attempts = await prisma.attempt.findMany({
    where: { userId: me!.id },
    orderBy: { startedAt: "desc" },
    include: { exam: { select: { title: true, slug: true } } },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Historie</h1>
        {attempts.length > 0 && <DeleteAllAttemptsButton />}
      </div>

      {attempts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine Versuche. <Link href="/exams" className="underline">Jetzt eine Prüfung starten</Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Datum</th>
                <th className="py-2 pr-4">Prüfung</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a => {
                const date = new Date(a.startedAt).toLocaleString("de-DE")
                const status = a.finishedAt ? (a.passed ? "Bestanden ✅" : "Nicht bestanden ❌") : "Laufend ⏳"
                const score = a.finishedAt ? `${a.scorePercent ?? 0}%` : "-"
                return (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{date}</td>
                    <td className="py-2 pr-4">
                      <Link className="underline" href={`/exams/${a.exam.slug}`}>{a.exam.title}</Link>
                    </td>
                    <td className="py-2 pr-4">{status}</td>
                    <td className="py-2 pr-4">{score}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        {a.finishedAt ? (
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/history/${a.id}`}>Details</Link>
                          </Button>
                        ) : (
                          <Button asChild>
                            <Link href={`/exam-run/${a.id}`}>Fortsetzen</Link>
                          </Button>
                        )}
                        <DeleteAttemptButton attemptId={a.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// app/(dashboard)/dashboard/history/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DeleteAttemptButton, DeleteAllAttemptsButton } from "@/components/history-actions"
import { Button } from "@/components/ui/button"

export const runtime = "nodejs"

export default async function HistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  const attempts = await prisma.attempt.findMany({
    where: { userId: me.id },
    orderBy: { startedAt: "desc" },
    include: { exam: { select: { title: true, slug: true } } },
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dashboard</div>
            <h1 className="text-2xl font-semibold tracking-tight">Historie</h1>
            <p className="text-sm text-muted-foreground">Alle gestarteten und abgeschlossenen Prüfungsdurchläufe.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
            {attempts.length > 0 && <DeleteAllAttemptsButton />}
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Noch keine Versuche vorhanden.
        </div>
      ) : (
        <ul className="space-y-3">
          {attempts.map(a => (
            <li key={a.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="font-semibold">{a.exam.title}</div>
                <div className="text-xs text-muted-foreground">
                  Gestartet: {new Date(a.startedAt).toLocaleString()}
                  {a.finishedAt && <> · Ergebnis: {a.scorePercent}% · {a.passed ? "bestanden" : "nicht bestanden"}</>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/history/${a.id}`}>Details</Link>
                </Button>
                <DeleteAttemptButton id={a.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
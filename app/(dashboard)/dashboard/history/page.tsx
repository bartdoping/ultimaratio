// app/(dashboard)/dashboard/history/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DeleteAttemptButton, DeleteAllAttemptsButton } from "@/components/history-actions"

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Historie</h1>
        {attempts.length > 0 && <DeleteAllAttemptsButton />}
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Versuche.</p>
      ) : (
        <ul className="space-y-3">
          {attempts.map(a => (
            <li key={a.id} className="rounded border p-3 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">{a.exam.title}</div>
                <div className="text-xs text-muted-foreground">
                  Gestartet: {new Date(a.startedAt).toLocaleString()}
                  {a.finishedAt && <> · Ergebnis: {a.scorePercent}% {a.passed ? "✅" : "❌"}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/history/${a.id}`} className="btn btn-sm">Details</Link>
                <DeleteAttemptButton id={a.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
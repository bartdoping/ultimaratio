// app/(dashboard)/dashboard/page.tsx
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { StartExamButton } from "@/components/start-exam-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const runtime = "nodejs"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <p>Bitte zuerst einloggen.</p>
        <Link href="/login" className="underline text-blue-600">Zum Login</Link>
      </div>
    )
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  })
  if (!me) {
    return <p className="text-red-600">Benutzerkonto nicht gefunden.</p>
  }

  // Alle Käufe inkl. Exam
  const purchases = await prisma.purchase.findMany({
    where: { userId: me.id },
    include: { exam: { select: { id: true, title: true, slug: true, description: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Offene Versuche für diese Exams (ein Query, dann in Map)
  const openAttempts = await prisma.attempt.findMany({
    where: { userId: me.id, finishedAt: null },
    select: { id: true, examId: true },
  })
  const openByExam = new Map(openAttempts.map(a => [a.examId, a.id]))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/history">
            <Button variant="outline">Zur Historie</Button>
          </Link>
          <Link href="/exams">
            <Button>Weitere Prüfungen</Button>
          </Link>
        </div>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Käufe gefunden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3">Du hast noch keine Prüfung erworben.</p>
            <Link href="/exams" className="underline text-blue-600">Zu den Prüfungen</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchases.map((p) => {
            const e = p.exam
            const openAttemptId = openByExam.get(e.id) || null
            return (
              <Card key={e.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{e.title}</CardTitle>
                    <Badge variant="default">Erworben</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}

                  {openAttemptId ? (
                    <div className="flex items-center gap-3">
                      <Link href={`/exam-run/${openAttemptId}`}>
                        <Button>Weiter</Button>
                      </Link>
                      <span className="text-sm text-muted-foreground">Du hast einen offenen Versuch.</span>
                    </div>
                  ) : (
                    <StartExamButton examId={e.id} />
                  )}

                  <div className="text-xs text-muted-foreground">
                    <Link href={`/exams/${e.slug}`} className="underline">Details</Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

<p className="text-sm text-muted-foreground">
  Verlauf ansehen: <Link className="underline" href="/dashboard/history">Historie</Link>
</p>
// app/practice/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PracticeDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  // Nur gekaufte Prüfungen listen
  const purchased = await prisma.purchase.findMany({
    where: { userId: me.id },
    select: { exam: { select: { id: true, title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  })
  const exams = purchased.map(p => p.exam)

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Trainingsmodus</h1>
      <p className="text-muted-foreground">
        Übe gezielt mit Filtern – Sofort-Feedback ist aktiv, es gibt kein „Beenden &amp; Auswerten“.
      </p>

      {exams.length === 0 ? (
        <div className="rounded border p-4 text-sm">
          Du hast noch keine freigeschalteten Prüfungen.{" "}
          <Link className="underline" href="/exams">Zu den Prüfungen</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((e) => (
            <div key={e.id} className="rounded-md border p-4 space-y-3">
              <div className="font-medium">{e.title}</div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn btn-outline" href={`/practice/${e.id}?filter=all`}>Alle</Link>
                <Link className="btn btn-outline" href={`/practice/${e.id}?filter=wrong`}>Falsch</Link>
                <Link className="btn btn-outline" href={`/practice/${e.id}?filter=flagged`}>Markiert</Link>
                <Link className="btn btn-outline" href={`/practice/${e.id}?filter=open`}>Unbeantwortet</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
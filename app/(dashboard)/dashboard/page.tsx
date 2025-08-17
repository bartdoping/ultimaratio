// app/(dashboard)/dashboard/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"
import { StartExamButton } from "@/components/start-exam-button"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? null

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <p className="text-muted-foreground">Bitte zuerst einloggen.</p>
      </div>
    )
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, surname: true } })
  const purchases = await prisma.purchase.findMany({
    where: { userId: user!.id },
    include: { exam: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <p className="text-muted-foreground">E-Mail: {email}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Meine Produkte</h2>
        {purchases.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Produkte erworben. <Link href="/exams" className="underline">Zu den Prüfungen</Link></p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {purchases.map((p) => (
              <div key={p.id} className="border rounded-md p-3 space-y-2">
                <div className="font-medium">{p.exam.title}</div>
                <div className="text-sm text-muted-foreground">{p.exam.description}</div>
                <div className="flex gap-2">
                  <StartExamButton slug={p.exam.slug} />
                  <Button variant="outline" asChild><Link href={`/exams/${p.exam.slug}`}>Details</Link></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historie (bald)</h2>
        <p className="text-muted-foreground text-sm">Versuche & Ergebnisse erscheinen in M6 hier.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historie</h2>
        <p className="text-muted-foreground text-sm">
          Deine Versuche findest du in der <Link href="/dashboard/history" className="underline">Historie</Link>.
        </p>
      </section>
    </div>
  )
}

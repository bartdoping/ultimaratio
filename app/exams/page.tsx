// app/exams/page.tsx
import Link from "next/link"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Lock } from "lucide-react"
import { StartExamButton } from "@/components/start-exam-button"

export const dynamic = "force-dynamic"

export default async function ExamsPage() {
  // Eingeloggt?
  const session = await getServerSession(authOptions)

  // Alle veröffentlichten Prüfungen
  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, description: true, priceCents: true },
  })

  // IDs gekaufter Exams des Users
  let purchasedIds = new Set<string>()
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (user) {
      const purchases = await prisma.purchase.findMany({
        where: { userId: user.id },
        select: { examId: true },
      })
      purchasedIds = new Set(purchases.map((p) => p.examId))
    }
  }

  if (exams.length === 0) {
    return <p className="text-muted-foreground">Noch keine Prüfungen veröffentlicht.</p>
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {exams.map((e) => {
        const owned = purchasedIds.has(e.id)
        const price = (e.priceCents / 100).toFixed(2).replace(".", ",")
        return (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle>{e.title}</CardTitle>
              <CardDescription>{e.description}</CardDescription>
            </CardHeader>

            <CardFooter className="flex items-center justify-between gap-3">
              {owned ? (
                <span className="inline-flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Bereits erworben
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  Gesperrt (kein Kauf) · {price} €
                </span>
              )}

              <div className="flex items-center gap-2">
                {owned ? (
                  <StartExamButton slug={e.slug} />
                ) : null}
                <Button variant={owned ? "outline" : "default"} asChild>
                  <Link href={`/exams/${e.slug}`}>Details</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

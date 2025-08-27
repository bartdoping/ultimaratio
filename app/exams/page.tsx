// app/exams/page.tsx
import Link from "next/link"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { StartExamButton } from "@/components/start-exam-button"

export const dynamic = "force-dynamic"

export default async function ExamsListPage() {
  const session = await getServerSession(authOptions)

  // Alle veröffentlichten Exams
  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
    },
  })

  // Gekaufte Exams des eingeloggten Users (als Set für O(1)-Lookup)
  let purchasedExamIds = new Set<string>()
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (me) {
      const purchases = await prisma.purchase.findMany({
        where: { userId: me.id },
        select: { examId: true },
      })
      purchasedExamIds = new Set(purchases.map(p => p.examId))
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Prüfungen</h1>
      <div className="grid gap-4">
        {exams.map((e) => {
          const isPurchased = purchasedExamIds.has(e.id)
          return (
            <div key={e.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{e.title}</h2>
                  <p className="text-sm text-muted-foreground">{e.description}</p>
                </div>
                <div className="text-right text-sm">
                  {(e.priceCents / 100).toFixed(2)} €
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {/* Details-Link: Text abhängig vom Kaufstatus */}
                <Link
                  className="btn btn-outline"
                  href={`/exams/${e.slug}`}
                >
                  {isPurchased ? "Details" : "Details & Kaufen"}
                </Link>

                {/* Nur bei gekauften Prüfungen: Start & Üben */}
                {isPurchased && (
                  <>
                    <StartExamButton examId={e.id} />
                    <Link className="btn btn-secondary" href={`/practice/${e.id}`}>
                      Üben
                    </Link>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
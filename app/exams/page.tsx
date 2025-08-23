// app/exams/page.tsx
import prisma from "@/lib/db"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { CheckoutButton } from "@/components/checkout-button"
import { StartExamButton } from "@/components/start-exam-button"

export const runtime = "nodejs"

export default async function ExamsPage() {
  const session = await getServerSession(authOptions)

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null

  const purchases = user
    ? await prisma.purchase.findMany({
        where: { userId: user.id },
        select: { examId: true },
      })
    : []

  const owned = new Set(purchases.map((p) => p.examId))

  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, description: true, priceCents: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Prüfungen</h1>

      <div className="grid gap-4">
        {exams.map((e) => (
          <div key={e.id} className="rounded border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                <Link href={`/exams/${e.slug}`} className="hover:underline">
                  {e.title}
                </Link>
              </h2>
              <span className="text-sm text-muted-foreground">
                {(e.priceCents / 100).toFixed(2).replace(".", ",")} €
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{e.description}</p>

            <div className="pt-2">
              {owned.has(e.id) ? (
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm">Bereits erworben</span>
                  <StartExamButton examId={e.id} />
                </div>
              ) : session?.user ? (
                <CheckoutButton slug={e.slug} />
              ) : (
                <Link href="/login" className="btn">Jetzt freischalten (Login nötig)</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
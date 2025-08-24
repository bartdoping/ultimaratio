// app/exams/page.tsx
import Link from "next/link"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ExamsListPage() {
  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      stripePriceId: true, // <<<
    },
  })

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Prüfungen</h1>
      <div className="grid gap-4">
        {exams.map((e) => (
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
            <div className="mt-3">
              <Link className="underline text-sm" href={`/exams/${e.slug}`}>
                Details & Kaufen
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
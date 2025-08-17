// app/exams/[slug]/page.tsx
import prisma from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import { CheckoutButton } from "@/components/checkout-button"
import { StartExamButton } from "@/components/start-exam-button"
import stripe from "@/lib/stripe"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ExamDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const session = await getServerSession(authOptions)

  const exam = await prisma.exam.findUnique({ where: { slug } })
  if (!exam || !exam.isPublished) notFound()

  // 1) Wenn vom Checkout zurück: Stripe-Session prüfen & Kauf eintragen (serverseitig, ohne Client-Fallback)
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : undefined
  if (session?.user?.email && sessionId) {
    try {
      const s = await stripe.checkout.sessions.retrieve(sessionId)
      if (s.payment_status === "paid") {
        // user/exam ermitteln
        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        const examId = (s.metadata?.examId as string | undefined) ?? undefined
        if (user && examId) {
          const exists = await prisma.purchase.findFirst({ where: { userId: user.id, examId } })
          if (!exists) {
            await prisma.purchase.create({ data: { userId: user.id, examId, stripeSessionId: s.id } })
          }
        }
      }
    } catch {
      // falls Stripe nicht erreichbar → Webhook übernimmt die Freischaltung
    }
  }

  // 2) Besitz prüfen
  let purchased = false
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (user) {
      const p = await prisma.purchase.findFirst({ where: { userId: user.id, examId: exam.id } })
      purchased = !!p
    }
  }

  const price = (exam.priceCents / 100).toFixed(2).replace(".", ",")

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">{exam.title}</h1>
      <p className="text-muted-foreground">{exam.description}</p>
      <p><strong>Preis:</strong> {price} €</p>

      {purchased ? (
        <div className="flex items-center gap-3">
          <StartExamButton slug={slug} />
          <span className="text-green-600 text-sm">Freigeschaltet</span>
        </div>
      ) : session ? (
        <CheckoutButton slug={slug} />
      ) : (
        <div className="flex gap-2">
          <Button asChild><Link href={`/login?next=/exams/${slug}`}>Login</Link></Button>
          <Button variant="outline" asChild><Link href={`/register?next=/exams/${slug}`}>Registrieren</Link></Button>
        </div>
      )}

      {sp.success === "1" && !purchased && (
        <p className="text-green-600 text-sm">Kauf erfolgreich – Zugriff wird freigeschaltet.</p>
      )}
      {sp.canceled === "1" && (
        <p className="text-orange-600 text-sm">Zahlung abgebrochen.</p>
      )}

      <div className="pt-6">
        <Button variant="outline" asChild><Link href="/exams">Zurück</Link></Button>
      </div>
    </div>
  )
}

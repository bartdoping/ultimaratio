// app/exams/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { ConfirmAfterReturn } from "@/components/confirm-after-return";
import { CheckoutButton } from "@/components/checkout-button";
import { StartExamButton } from "@/components/start-exam-button";

export const dynamic = "force-dynamic";

// ⬇️ WICHTIG: params ist ein Promise in Next.js 15
type PageProps = { params: Promise<{ slug: string }> };

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

export default async function ExamPage({ params }: PageProps) {
  const { slug } = await params; // ⬅️ fix

  const session = await getServerSession(authOptions);

  const exam = await prisma.exam.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      isPublished: true,
      passPercent: true,
      allowImmediateFeedback: true,
    },
  });

  if (!exam || !exam.isPublished) {
    notFound();
  }

  // Prüfen, ob der eingeloggte Nutzer die Prüfung gekauft hat
  let hasPurchase = false;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (me) {
      const purchase = await prisma.purchase.findUnique({
        where: { userId_examId: { userId: me.id, examId: exam.id } },
        select: { id: true },
      });
      hasPurchase = !!purchase;
    }
  }

  return (
    <>
      {/* Stripe-Rückkehr-Helper: bestätigt /api/stripe/confirm?session_id=... und refresht */}
      <ConfirmAfterReturn />

      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{exam.title}</h1>
          <p className="text-muted-foreground">{exam.description}</p>
        </header>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preis</span>
            <span className="text-lg font-medium">{formatPrice(exam.priceCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bestehensgrenze</span>
            <span className="text-lg">{exam.passPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sofort-Feedback</span>
            <span className="text-lg">{exam.allowImmediateFeedback ? "Ja" : "Nein"}</span>
          </div>
        </div>

        {!hasPurchase ? (
          session?.user ? (
            <div className="space-y-2">
              {/* ⬇️ Checkout braucht den slug */}
              <CheckoutButton slug={exam.slug} />
              <p className="text-sm text-muted-foreground">
                Nach der Zahlung wirst du automatisch freigeschaltet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
              >
                Einloggen, um zu kaufen
              </Link>
              <p className="text-sm text-muted-foreground">
                Du benötigst ein Konto, um die Prüfung zu erwerben.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {/* ⬇️ Start braucht die examId */}
            <StartExamButton examId={exam.id} />
            <p className="text-sm text-muted-foreground">
              Deine Versuche findest du unter{" "}
              <Link href="/dashboard/history" className="underline">
                Verlauf
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </>
  );
}
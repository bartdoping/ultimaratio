// app/exams/[slug]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import { CheckoutButton } from "@/components/checkout-button";
import { StartExamButton } from "@/components/start-exam-button";
import { StripeConfirmOnce } from "@/components/stripe-confirm";

export const dynamic = "force-dynamic"; // immer frische DB-Daten (alternativ: export const revalidate = 0)

type PageProps = { params: { slug: string } };

export default async function ExamDetailPage({ params }: PageProps) {
  const { slug } = params;

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

  // In PROD nicht veröffentlichte Prüfungen verstecken
  if (!exam || (!exam.isPublished && process.env.NODE_ENV === "production")) {
    return notFound();
  }

  const session = await getServerSession(authOptions);

  let hasPurchase = false;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (me) {
      const purchase = await prisma.purchase.findFirst({
        where: { userId: me.id, examId: exam.id },
        select: { id: true },
      });
      hasPurchase = !!purchase;
    }
  }

  const priceEuro = (exam.priceCents ?? 0) / 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Fallback: legt Kauf nach Stripe-Redirect an, falls Webhook (lokal) nicht ankam */}
      <Suspense fallback={null}>
        <StripeConfirmOnce />
      </Suspense>

      <h1 className="text-2xl font-semibold">{exam.title}</h1>

      {exam.description && (
        <p className="text-muted-foreground">{exam.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xl font-medium">
          {priceEuro.toFixed(2)} €
        </span>
        <span className="text-sm text-muted-foreground">
          Bestehensgrenze: {exam.passPercent}%
        </span>
        {exam.allowImmediateFeedback && (
          <span className="text-xs rounded bg-gray-100 px-2 py-1">
            Sofortiges Feedback
          </span>
        )}
      </div>

      {!hasPurchase ? (
        session?.user?.id ? (
          <CheckoutButton examId={exam.id} />
        ) : (
          <a
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Einloggen, um zu kaufen
          </a>
        )
      ) : (
        <StartExamButton examId={exam.id} />
      )}

      <div>
        <a href="/exams" className="text-sm underline">
          Zurück zur Übersicht
        </a>
      </div>
    </div>
  );
}
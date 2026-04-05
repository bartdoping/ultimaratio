import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { ConfirmAfterReturn } from "@/components/confirm-after-return";
import { StartExamButton } from "@/components/start-exam-button";
import { CheckoutButton } from "@/components/checkout-button";
import { hasExamLearningAccess, isProOrAdmin } from "@/lib/exam-access";

export const dynamic = "force-dynamic";

// ⬇️ WICHTIG: params ist ein Promise in Next.js 15
type PageProps = { params: Promise<{ slug: string }> };

export default async function ExamPage({ params }: PageProps) {
  const { slug } = await params; // ⬅️ korrekt für Next 15

  const session = await getServerSession(authOptions);

  const exam = await prisma.exam.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isPublished: true,
      isFreeTrialDemo: true,
      priceCents: true,
      passPercent: true,
      allowImmediateFeedback: true,
      questions: {
        select: {
          id: true,
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    },
  });

  if (!exam || !exam.isPublished) {
    notFound();
  }

  let hasAccess = false;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionStatus: true, role: true },
    });
    if (me) {
      if (exam.isFreeTrialDemo && isProOrAdmin(me.role, me.subscriptionStatus)) {
        redirect("/exams");
      }
      const purchase = await prisma.purchase.findUnique({
        where: { userId_examId: { userId: me.id, examId: exam.id } },
        select: { id: true },
      });
      hasAccess = hasExamLearningAccess(
        me.role,
        me.subscriptionStatus,
        exam.isFreeTrialDemo,
        !!purchase
      );
    }
  }

  const priceCents = exam.priceCents;
  const canBuyOnce =
    !!session?.user?.email &&
    !hasAccess &&
    !exam.isFreeTrialDemo &&
    typeof priceCents === "number" &&
    Number.isFinite(priceCents) &&
    priceCents > 0;

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
      cents / 100
    );
  }

  // Alle einzigartigen Tags sammeln
  const allTags = new Map();
  exam.questions.forEach(question => {
    question.tags.forEach(tagLink => {
      const tag = tagLink.tag;
      if (!allTags.has(tag.id)) {
        allTags.set(tag.id, tag);
      }
    });
  });
  const uniqueTags = Array.from(allTags.values());

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
            <span className="text-sm text-muted-foreground">Anzahl Fragen</span>
            <span className="text-lg font-medium">{exam.questions.length}</span>
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

        {/* Tags anzeigen */}
        {uniqueTags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Themengebiete</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {!hasAccess ? (
          session?.user ? (
            <div className="space-y-4">
              {canBuyOnce && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Diese Prüfung einzeln kaufen</h3>
                  <p className="text-sm text-muted-foreground">
                    Einmalzahlung {formatPrice(priceCents!)} – unbegrenzter Zugang zu genau dieser Prüfung,
                    unabhängig von einem Abo. Die Zahlung läuft über Stripe.
                  </p>
                  <CheckoutButton slug={exam.slug} />
                </div>
              )}
              <div className="text-center py-6 rounded-lg border bg-muted/30">
                <h3 className="text-lg font-semibold mb-2">Oder alle Prüfungen mit Pro</h3>
                <p className="text-muted-foreground mb-4 text-sm px-2">
                  Mit dem Pro-Abo nutzt du die gesamte Fragenbank und alle Pro-Funktionen.
                </p>
                <Link
                  href="/subscription"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Zu Pro upgraden
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mit einem Konto kannst du diese Prüfung einzeln erwerben (sofern ein Preis gesetzt ist) oder alle
                Inhalte mit Pro nutzen.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/login?next=${encodeURIComponent(`/exams/${exam.slug}`)}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
                >
                  Einloggen
                </Link>
                <Link
                  href={`/register?next=${encodeURIComponent(`/exams/${exam.slug}`)}`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Registrieren
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {/* ⬇️ Start braucht die examId */}
            <div className="flex flex-wrap gap-2">
              <StartExamButton examId={exam.id} />
              {/* ✅ Neu: direkt üben (Practice-Modus) – erscheint nur nach Aktivierung */}
              <Link
                href={`/practice/${exam.id}`}
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
              >
                Üben
              </Link>
            </div>

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
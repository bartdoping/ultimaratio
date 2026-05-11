import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { ConfirmAfterReturn } from "@/components/confirm-after-return";
import { StartExamButton } from "@/components/start-exam-button";
import { CheckoutButton } from "@/components/checkout-button";
import { Button } from "@/components/ui/button";
import { hasExamLearningAccess, isProOrAdmin } from "@/lib/exam-access";
import { examDisableStartPopupColumnExists } from "@/lib/exam-disable-start-popup-column";

export const dynamic = "force-dynamic";

// ⬇️ WICHTIG: params ist ein Promise in Next.js 15
type PageProps = { params: Promise<{ slug: string }> };

export default async function ExamPage({ params }: PageProps) {
  const { slug } = await params; // ⬅️ korrekt für Next 15

  const session = await getServerSession(authOptions);
  const disableStartPopupReady = await examDisableStartPopupColumnExists();

  const exam = await prisma.exam.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isPublished: true,
      isFreeTrialDemo: true,
      ...(disableStartPopupReady ? { disableStartPopup: true as const } : {}),
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

      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prüfungsdetails</div>
            <h1 className="text-3xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{exam.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {exam.questions.length} Frage{exam.questions.length === 1 ? "" : "n"}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              Bestehensgrenze {exam.passPercent}%
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {exam.allowImmediateFeedback ? "Sofort-Feedback möglich" : "Prüfungsmodus ohne Sofort-Feedback"}
            </span>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Fragen</div>
            <div className="mt-1 text-2xl font-semibold">{exam.questions.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Bestehensgrenze</div>
            <div className="mt-1 text-2xl font-semibold">{exam.passPercent}%</div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Feedback</div>
            <div className="mt-1 text-base font-semibold">
              {exam.allowImmediateFeedback ? "Optional direkt" : "Nach Abschluss"}
            </div>
          </div>
        </div>

        {/* Tags anzeigen */}
        {uniqueTags.length > 0 && (
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div>
              <h3 className="font-semibold">Themengebiete</h3>
              <p className="text-sm text-muted-foreground">Diese Tags kannst du beim Start zum Filtern verwenden.</p>
            </div>
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
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold">Diese Prüfung einzeln kaufen</h3>
                  <p className="text-sm text-muted-foreground">
                    Einmalzahlung {formatPrice(priceCents!)}. Danach bleibt diese Prüfung dauerhaft freigeschaltet.
                  </p>
                  <CheckoutButton slug={exam.slug} />
                </div>
              )}
              <div className="rounded-xl border bg-card p-5 text-center shadow-sm">
                <h3 className="text-lg font-semibold">Alle Prüfungen mit Pro</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Mit dem Pro-Abo nutzt du die gesamte Fragenbank und alle Pro-Funktionen.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/subscription">Pro ansehen</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-lg font-semibold">Einloggen und loslegen</h3>
              <p className="text-sm text-muted-foreground">
                Mit einem Konto kannst du diese Prüfung freischalten oder Pro nutzen.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/exams/${exam.slug}`)}`}>Einloggen</Link>
                </Button>
                <Button asChild>
                  <Link href={`/register?next=${encodeURIComponent(`/exams/${exam.slug}`)}`}>Registrieren</Link>
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            {/* ⬇️ Start braucht die examId */}
            <div className="flex flex-wrap gap-2">
              <StartExamButton examId={exam.id} disableStartPopup={disableStartPopupReady ? !!exam.disableStartPopup : false} />
              {/* ✅ Neu: direkt üben (Practice-Modus) – erscheint nur nach Aktivierung */}
              <Button variant="outline" asChild>
                <Link href={`/practice/${exam.id}`}>Übungsmodus</Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Deine bisherigen Versuche findest du in der{" "}
              <Link href="/dashboard/history" className="underline">
                Historie
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </>
  );
}
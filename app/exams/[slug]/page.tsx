import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { ConfirmAfterReturn } from "@/components/confirm-after-return";
import { CheckoutButton } from "@/components/checkout-button";
import { StartExamButton } from "@/components/start-exam-button";
;

export const dynamic = "force-dynamic";

// ⬇️ WICHTIG: params ist ein Promise in Next.js 15
type PageProps = { params: Promise<{ slug: string }> };

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

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
      priceCents: true,
      isPublished: true,
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

  // Prüfen, ob der eingeloggte Nutzer Pro-User ist
  let hasAccess = false;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionStatus: true },
    });
    if (me) {
      hasAccess = me.subscriptionStatus === "pro";
    }
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
            <div className="space-y-2">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Pro-Abonnement erforderlich</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade zu Pro für unbegrenzten Zugang zu allen Prüfungen!
                </p>
                <Link
                  href="/dashboard/account"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Jetzt upgraden
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
              >
                Einloggen, um zu starten
              </Link>
              <p className="text-sm text-muted-foreground">
                Du benötigst ein Konto, um die Prüfung zu nutzen.
              </p>
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
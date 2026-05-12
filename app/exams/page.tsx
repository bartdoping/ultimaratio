// app/exams/page.tsx
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import ExamsCategorized from "@/components/exams-categorized"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { examDisableStartPopupColumnExists } from "@/lib/exam-disable-start-popup-column"
import { showFreeTrialExamPromo } from "@/lib/exam-access"

export const dynamic = "force-dynamic"

function normalizeCatalogExam(exam: {
  id: string
  slug: string
  title: string
  description: string
  priceCents: number | null
  disableStartPopup?: boolean
  category?: { id: string; name: string; color: string | null } | null
  _count: { questions: number }
  questions: Array<{ tags: Array<{ tag: { id: string; name: string; slug: string } }> }>
}) {
  const tags = new Map<string, { id: string; name: string; slug: string }>()
  for (const question of exam.questions) {
    for (const link of question.tags) {
      tags.set(link.tag.id, link.tag)
    }
  }

  return {
    id: exam.id,
    slug: exam.slug,
    title: exam.title,
    description: exam.description,
    priceCents: exam.priceCents,
    disableStartPopup: exam.disableStartPopup,
    category: exam.category ?? null,
    _count: exam._count,
    tags: Array.from(tags.values()).sort((a, b) => a.name.localeCompare(b.name, "de")),
  }
}

export default async function ExamsListPage() {
  const session = await getServerSession(authOptions)

  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()

  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  const catalogWhere = { ...examListWhere, isFreeTrialDemo: false } as const

  const disableStartPopupReady = await examDisableStartPopupColumnExists()

  // Alle veröffentlichten Exams mit Kategorien und Fragenanzahl (ohne Probedeck in der Liste)
  const exams = await prisma.exam.findMany({
    where: catalogWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      ...(disableStartPopupReady ? { disableStartPopup: true as const } : {}),
      category: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      _count: {
        select: {
          questions: true
        }
      },
      questions: {
        select: {
          tags: {
            select: {
              tag: { select: { id: true, name: true, slug: true } }
            }
          }
        }
      },
    },
  })

  // Alle Kategorien mit Prüfungen
  const categories = await prisma.category.findMany({
    where: {
      exams: {
        some: catalogWhere,
      }
    },
    orderBy: [
      { order: "asc" },
      { name: "asc" }
    ],
    include: {
      exams: {
        where: catalogWhere,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          priceCents: true,
          ...(disableStartPopupReady ? { disableStartPopup: true as const } : {}),
          _count: {
            select: {
              questions: true
            }
          },
          questions: {
            select: {
              tags: {
                select: {
                  tag: { select: { id: true, name: true, slug: true } }
                }
              }
            }
          },
        }
      }
    }
  })

  let hasProAccess = false;
  let purchasedExamIds: string[] = []
  let openAttempts: Array<{
    id: string
    examId: string
    startedAt: Date
    elapsedSec: number | null
  }> = [];

  let showTrialPromo = false

  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionStatus: true, role: true },
    })
    if (me) {
      hasProAccess = me.subscriptionStatus === "pro" || me.role === "admin"
      showTrialPromo = showFreeTrialExamPromo(me.role, me.subscriptionStatus)

      const purchases = await prisma.purchase.findMany({
        where: { userId: me.id },
        select: { examId: true },
      })
      purchasedExamIds = purchases.map((p) => p.examId)
      
      // Lade offene Prüfungsdurchläufe für den Benutzer
      openAttempts = await prisma.attempt.findMany({
        where: { userId: me.id, finishedAt: null },
        select: { 
          id: true, 
          examId: true, 
          startedAt: true,
          elapsedSec: true
        },
        orderBy: { startedAt: "desc" }
      })
    }
  } else {
    showTrialPromo = true
  }

  const freeTrialExam = showTrialPromo
    ? await prisma.exam.findFirst({
        where: { ...examListWhere, isFreeTrialDemo: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: { select: { questions: true } },
          ...(disableStartPopupReady ? { disableStartPopup: true as const } : {}),
        },
      })
    : null

  const catalogExams = exams.map(normalizeCatalogExam)
  const catalogCategories = categories.map(category => ({
    ...category,
    exams: category.exams.map(normalizeCatalogExam),
  }))

  // Prüfungen ohne Kategorie
  const examsWithoutCategory = catalogExams.filter(exam => !exam.category)

  const trialPayload = freeTrialExam
    ? {
        id: freeTrialExam.id,
        slug: freeTrialExam.slug,
        title: freeTrialExam.title,
        description: freeTrialExam.description,
        questionCount: freeTrialExam._count.questions,
        disableStartPopup: disableStartPopupReady ? freeTrialExam.disableStartPopup : false,
      }
    : null

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prüfungskatalog</div>
          <h1 className="text-3xl font-semibold tracking-tight">Prüfungen</h1>
          <p className="text-sm text-muted-foreground">
            Starte eine komplette Prüfung, übe gezielt mit Tags oder setze einen offenen Durchlauf fort.
          </p>
        </div>
      </header>
      
      <ExamsCategorized 
        categories={catalogCategories}
        examsWithoutCategory={examsWithoutCategory}
        hasProAccess={hasProAccess}
        purchasedExamIds={purchasedExamIds}
        openAttempts={openAttempts}
        freeTrialExam={trialPayload}
        showFreeTrialSection={!!trialPayload}
        loggedIn={!!session?.user?.email}
      />
    </div>
  )
}
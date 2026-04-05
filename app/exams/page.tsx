// app/exams/page.tsx
import Link from "next/link"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { StartExamButton } from "@/components/start-exam-button"
import ExamsCategorized from "@/components/exams-categorized"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { showFreeTrialExamPromo } from "@/lib/exam-access"

export const dynamic = "force-dynamic"

export default async function ExamsListPage() {
  const session = await getServerSession(authOptions)

  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()

  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  const catalogWhere = { ...examListWhere, isFreeTrialDemo: false } as const

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
      }
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
          _count: {
            select: {
              questions: true
            }
          }
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
        },
      })
    : null

  // Prüfungen ohne Kategorie
  const examsWithoutCategory = exams.filter(exam => !exam.category)

  const trialPayload = freeTrialExam
    ? {
        id: freeTrialExam.id,
        slug: freeTrialExam.slug,
        title: freeTrialExam.title,
        description: freeTrialExam.description,
        questionCount: freeTrialExam._count.questions,
      }
    : null

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Prüfungen</h1>
      
      <ExamsCategorized 
        categories={categories}
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
// app/exams/page.tsx
import Link from "next/link"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { StartExamButton } from "@/components/start-exam-button"
import ExamsCategorized from "@/components/exams-categorized"
import { initCategoriesTables } from "@/lib/init-categories-tables"

export const dynamic = "force-dynamic"

export default async function ExamsListPage() {
  const session = await getServerSession(authOptions)

  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()

  // Alle veröffentlichten Exams mit Kategorien und Fragenanzahl
  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
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
        some: {
          isPublished: true
        }
      }
    },
    orderBy: [
      { order: "asc" },
      { name: "asc" }
    ],
    include: {
      exams: {
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: {
            select: {
              questions: true
            }
          }
        }
      }
    }
  })

  // Pro-User haben Zugang zu allen Prüfungen
  let hasAccess = false;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionStatus: true },
    })
    if (me) {
      hasAccess = me.subscriptionStatus === "pro";
    }
  }

  // Prüfungen ohne Kategorie
  const examsWithoutCategory = exams.filter(exam => !exam.category)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Prüfungen</h1>
      
      <ExamsCategorized 
        categories={categories}
        examsWithoutCategory={examsWithoutCategory}
        hasAccess={hasAccess}
      />
    </div>
  )
}
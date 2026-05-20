import prisma from "@/lib/db"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { examDisableStartPopupColumnExists } from "@/lib/exam-disable-start-popup-column"

export type FreeTrialExamPublic = {
  id: string
  slug: string
  title: string
  description: string
  questionCount: number
  disableStartPopup: boolean
}

export async function loadFreeTrialExam(): Promise<FreeTrialExamPublic | null> {
  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  const disableStartPopupReady = await examDisableStartPopupColumnExists()

  const exam = await prisma.exam.findFirst({
    where: { ...examListWhere, isFreeTrialDemo: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      ...(disableStartPopupReady ? { disableStartPopup: true as const } : {}),
      _count: { select: { questions: true } },
    },
  })

  if (!exam || exam._count.questions === 0) return null

  return {
    id: exam.id,
    slug: exam.slug,
    title: exam.title,
    description: exam.description,
    questionCount: exam._count.questions,
    disableStartPopup:
      disableStartPopupReady && "disableStartPopup" in exam && typeof exam.disableStartPopup === "boolean"
        ? exam.disableStartPopup
        : false,
  }
}

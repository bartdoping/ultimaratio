"use server"

import { Prisma } from "@prisma/client"
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { redirect } from "next/navigation"

function clampPassPercent(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 60
  return Math.min(100, Math.max(0, Math.round(n)))
}

export async function createExamAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get("title") || "").trim()
  const slug = String(formData.get("slug") || "").trim()
  const description = String(formData.get("description") || "").trim()
  const passPercent = clampPassPercent(formData.get("passPercent"))
  const isPublished = formData.get("isPublished") === "on"

  if (!title || !slug) {
    redirect("/admin/exams/create?error=missing")
  }

  const hasVisibleCol = await examVisibleOnExamsPageColumnExists()
  let exam
  try {
    exam = await prisma.exam.create({
      data: {
        title,
        slug,
        description,
        passPercent,
        allowImmediateFeedback: true,
        isPublished,
        ...(hasVisibleCol ? { visibleOnExamsPage: true } : {}),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/admin/exams/create?error=slug-taken")
    }
    console.error("[createExamAction] prisma.exam.create:", e)
    redirect("/admin/exams/create?error=create-failed")
  }

  redirect(`/admin/exams/${exam.id}`)
}

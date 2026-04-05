"use server"

import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { redirect } from "next/navigation"

export async function createExamAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get("title") || "")
  const slug = String(formData.get("slug") || "")
  const description = String(formData.get("description") || "")
  const passPercent = Number(formData.get("passPercent") || 60)
  const isPublished = formData.get("isPublished") === "on"

  const hasVisibleCol = await examVisibleOnExamsPageColumnExists()
  const exam = await prisma.exam.create({
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
  redirect(`/admin/exams/${exam.id}`)
}

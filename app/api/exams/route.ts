import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { examVisibleOnExamsPageColumnExists } from '@/lib/exam-visible-on-exams-page-column'

export async function GET() {
  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  const exams = await prisma.exam.findMany({
    where: examListWhere,
    select: { id: true, slug: true, title: true, description: true, priceCents: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ exams })
}
// app/api/attempts/[id]/filtered-questions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// GET: Gefilterte Fragen für einen Attempt
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) {
    return NextResponse.json({ error: "user not found" }, { status: 401 })
  }

  const resolvedParams = await params
  // Attempt prüfen
  const attempt = await prisma.attempt.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      userId: true,
      examId: true,
      selectedQuestions: {
        orderBy: { order: "asc" },
        select: { questionId: true },
      },
    },
  })
  
  if (!attempt || attempt.userId !== me.id) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 })
  }

  return NextResponse.json({ 
    filteredQuestionIds: attempt.selectedQuestions.map(q => q.questionId)
  })
}

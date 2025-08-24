// app/api/attempts/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: me.id },
    include: {
      exam: { select: { id: true, title: true, allowImmediateFeedback: true } },
      answers: true,
    },
  });
  if (!attempt) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Alle Fragen der Prüfung inkl. Medien & Optionen
  const questions = await prisma.question.findMany({
    where: { examId: attempt.examId },
    orderBy: { id: "asc" },
    include: {
      options: { orderBy: { id: "asc" }, select: { id: true, text: true } },
      media: {
        orderBy: { order: "asc" },
        include: { media: { select: { id: true, url: true, alt: true } } },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    attempt: {
      id: attempt.id,
      examId: attempt.examId,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      title: attempt.exam.title,
      allowImmediateFeedbackGlobal: attempt.exam.allowImmediateFeedback,
      answers: attempt.answers.map(a => ({
        questionId: a.questionId,
        answerOptionId: a.answerOptionId,
      })),
    },
    questions: questions.map(q => ({
      id: q.id,
      stem: q.stem,
      explanation: q.explanation,
      hasImmediateFeedbackAllowed: q.hasImmediateFeedbackAllowed,
      options: q.options,
      media: q.media.map(m => ({
        id: m.media.id,
        url: m.media.url,
        alt: m.media.alt ?? "",
        order: m.order,
      })),
    })),
  });
}
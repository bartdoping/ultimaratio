// app/api/stripe/confirm/route.ts
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing session_id" }, { status: 400 });
    }

    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "not paid" }, { status: 400 });
    }

    const userId = (s.metadata?.userId as string) || "";
    const examId = (s.metadata?.examId as string) || "";

    if (!userId || !examId) {
      return NextResponse.json({ ok: false, error: "missing metadata" }, { status: 400 });
    }

    // User-/Exam-Existenz prüfen ohne E-Mail in Memory zu holen oder zu loggen.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true }
    });

    if (!exam) {
      return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
    }

    const exists = await prisma.purchase.findFirst({ where: { userId, examId } });
    if (!exists) {
      await prisma.purchase.create({
        data: {
          userId,
          examId,
          stripeSessionId: s.id,
          createdAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      purchase: {
        userId,
        examId,
        examTitle: exam.title,
      }
    });
  } catch (e) {
    const msg = (e as Error)?.message?.slice(0, 200)
    console.error("confirm error", { message: msg });
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
// app/api/stripe/confirm/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ ok: false, error: "missing session_id" }, { status: 400 });

    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== "paid") {
      return NextResponse.json({ ok: true, status: s.payment_status });
    }

    const userId = typeof s.metadata?.userId === "string" ? s.metadata.userId : undefined;
    const examId = typeof s.metadata?.examId === "string" ? s.metadata.examId : undefined;
    if (!userId || !examId) return NextResponse.json({ ok: false, error: "missing metadata" }, { status: 400 });

    const stripeSessionId = s.id;

    const exists = await prisma.purchase.findFirst({ where: { userId, examId } });
    if (!exists) {
      await prisma.purchase.create({ data: { userId, examId, stripeSessionId } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("confirm error", e);
    return NextResponse.json({ ok: false, error: "confirm_failed" }, { status: 500 });
  }
}
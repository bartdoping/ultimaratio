// app/api/stripe/confirm/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("session_id");
  if (!id) return NextResponse.json({ ok: false, error: "no session_id" }, { status: 400 });

  const s = await stripe.checkout.sessions.retrieve(id);
  if (s.payment_status !== "paid") {
    return NextResponse.json({ ok: false, error: "not paid" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const examId = (s.metadata?.examId as string) || "";

  if (!user || !examId) return NextResponse.json({ ok: false, error: "missing data" }, { status: 400 });

  const exists = await prisma.purchase.findFirst({ where: { userId: user.id, examId } });
  if (!exists) {
    await prisma.purchase.create({ data: { userId: user.id, examId, stripeSessionId: s.id } });
  }

  return NextResponse.json({ ok: true });
}

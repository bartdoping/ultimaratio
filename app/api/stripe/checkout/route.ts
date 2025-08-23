// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const { examId } = await req.json().catch(() => ({}));
    if (!examId) {
      return NextResponse.json({ ok: false, error: "missing examId" }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, slug: true, priceCents: true },
    });
    if (!exam) return NextResponse.json({ ok: false, error: "unknown exam" }, { status: 404 });

    const origin = new URL(req.url).origin;

    const lineItem =
      process.env.STRIPE_PRICE_GENERALPROBE
        ? { price: process.env.STRIPE_PRICE_GENERALPROBE, quantity: 1 }
        : {
            price_data: {
              currency: "eur",
              product_data: { name: exam.slug },
              unit_amount: exam.priceCents, // aus DB
            },
            quantity: 1,
          };

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem as any],
      success_url: `${origin}/exams/${exam.slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/exams/${exam.slug}?cancelled=1`,
      metadata: { userId: me.id, examId: exam.id },
    });

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (e: any) {
    console.error("checkout error", e);
    return NextResponse.json({ ok: false, error: "checkout_failed" }, { status: 500 });
  }
}